import * as SQLite from 'expo-sqlite';
import { GPSPoint, NearbyUser, SharedWalk, StatsSummary, UserSettings, WalkSession } from '../../types';
import { haversineDistance } from '../../geo/distance';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await SQLite.openDatabaseAsync('blackpath.db');
  await initTables(dbInstance);
  return dbInstance;
}

async function initTables(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      distance REAL NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      averagePace REAL NOT NULL DEFAULT 0,
      pathLength INTEGER NOT NULL DEFAULT 0,
      areaClaimed REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS gps_points (
      id TEXT PRIMARY KEY NOT NULL,
      sessionId TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timestamp INTEGER NOT NULL,
      accuracy REAL,
      speed REAL,
      altitude REAL,
      FOREIGN KEY (sessionId) REFERENCES sessions (id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_gps_points_session ON gps_points(sessionId);

    CREATE TABLE IF NOT EXISTS nearby_users (
      temporaryId TEXT PRIMARY KEY NOT NULL,
      firstSeen INTEGER NOT NULL,
      lastSeen INTEGER NOT NULL,
      status TEXT NOT NULL,
      cooldownUntil INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shared_walks (
      id TEXT PRIMARY KEY NOT NULL,
      temporaryPeerId TEXT NOT NULL,
      startedAt INTEGER NOT NULL,
      endedAt INTEGER,
      duration INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      discoverable INTEGER NOT NULL DEFAULT 1,
      notificationsEnabled INTEGER NOT NULL DEFAULT 1,
      units TEXT NOT NULL DEFAULT 'km'
    );

    INSERT OR IGNORE INTO settings (id, discoverable, notificationsEnabled, units)
    VALUES (1, 1, 1, 'km');
  `);

  // Migration: Add status column if missing from earlier versions
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(sessions);`);
    const hasStatus = tableInfo.some((col) => col.name === 'status');
    if (!hasStatus) {
      await db.execAsync(`ALTER TABLE sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed';`);
    }
  } catch (e) {
    console.warn('Migration error for sessions status column:', e);
  }
}

/* ============================================================================
 * SESSIONS DAO & ACTIVE SESSION RECOVERY
 * ============================================================================ */

export async function createActiveSession(sessionId: string, startedAt: number): Promise<WalkSession> {
  const db = await getDatabase();
  const session: WalkSession = {
    id: sessionId,
    startedAt,
    distance: 0,
    duration: 0,
    averagePace: 0,
    pathLength: 0,
    areaClaimed: 0,
    status: 'active',
  };

  await db.runAsync(
    `INSERT OR REPLACE INTO sessions 
      (id, startedAt, endedAt, distance, duration, averagePace, pathLength, areaClaimed, status)
     VALUES (?, ?, NULL, 0, 0, 0, 0, 0, 'active');`,
    [sessionId, startedAt]
  );

  return session;
}

export async function getActiveSession(): Promise<WalkSession | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<WalkSession>(
    `SELECT * FROM sessions WHERE status = 'active' ORDER BY startedAt DESC LIMIT 1;`
  );

  if (!session) return null;

  const points = await db.getAllAsync<GPSPoint>(
    `SELECT * FROM gps_points WHERE sessionId = ? ORDER BY timestamp ASC;`,
    [session.id]
  );

  return {
    ...session,
    points,
  };
}

export async function completeSession(
  session: WalkSession,
  points: GPSPoint[]
): Promise<void> {
  const db = await getDatabase();
  const endedAt = session.endedAt || Date.now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE sessions SET 
        endedAt = ?, 
        distance = ?, 
        duration = ?, 
        averagePace = ?, 
        pathLength = ?, 
        areaClaimed = ?, 
        status = 'completed'
       WHERE id = ?;`,
      [
        endedAt,
        session.distance,
        session.duration,
        session.averagePace,
        points.length,
        session.areaClaimed,
        session.id,
      ]
    );

    // Save any remaining unpersisted points
    for (const pt of points) {
      const ptId = pt.id || `${session.id}_${pt.timestamp}_${Math.random().toString(36).substring(2, 7)}`;
      await db.runAsync(
        `INSERT OR IGNORE INTO gps_points 
          (id, sessionId, latitude, longitude, timestamp, accuracy, speed, altitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ptId,
          session.id,
          pt.latitude,
          pt.longitude,
          pt.timestamp,
          pt.accuracy ?? null,
          pt.speed ?? null,
          pt.altitude ?? null,
        ]
      );
    }
  });
}

/**
 * DIRECT BACKGROUND PERSISTENCE:
 * Inserts a single GPS point directly into SQLite from the native background location task.
 * Operates independently of React UI or JS execution state.
 */
export async function insertBackgroundGPSPoint(
  sessionId: string,
  point: GPSPoint
): Promise<{ added: boolean; newTotalDistance: number }> {
  try {
    const db = await getDatabase();
    
    // Get last point recorded for this session to calculate incremental distance
    const lastPoint = await db.getFirstAsync<GPSPoint>(
      `SELECT latitude, longitude FROM gps_points WHERE sessionId = ? ORDER BY timestamp DESC LIMIT 1;`,
      [sessionId]
    );

    let incrementalDist = 0;
    if (lastPoint) {
      incrementalDist = haversineDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        point.latitude,
        point.longitude
      );

      // Stationarity Filter: Ignore micro-jitter (< 1.5m movement)
      if (incrementalDist < 1.5) {
        return { added: false, newTotalDistance: 0 };
      }
    }

    const ptId = point.id || `${sessionId}_${point.timestamp}_${Math.random().toString(36).substring(2, 7)}`;

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR IGNORE INTO gps_points 
          (id, sessionId, latitude, longitude, timestamp, accuracy, speed, altitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ptId,
          sessionId,
          point.latitude,
          point.longitude,
          point.timestamp,
          point.accuracy ?? null,
          point.speed ?? null,
          point.altitude ?? null,
        ]
      );

      await db.runAsync(
        `UPDATE sessions SET 
          distance = distance + ?, 
          pathLength = pathLength + 1 
         WHERE id = ?;`,
        [incrementalDist, sessionId]
      );
    });

    const updatedSession = await db.getFirstAsync<{ distance: number }>(
      `SELECT distance FROM sessions WHERE id = ?;`,
      [sessionId]
    );

    return { added: true, newTotalDistance: updatedSession?.distance || 0 };
  } catch (e) {
    console.error('Error inserting background GPS point into SQLite:', e);
    return { added: false, newTotalDistance: 0 };
  }
}

export async function saveSession(session: WalkSession, points: GPSPoint[]): Promise<void> {
  return completeSession(session, points);
}

export async function getAllSessions(): Promise<WalkSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WalkSession>(
    `SELECT * FROM sessions WHERE status = 'completed' ORDER BY startedAt DESC;`
  );
  return rows;
}

export async function getSessionById(id: string): Promise<WalkSession | null> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<WalkSession>(
    `SELECT * FROM sessions WHERE id = ?;`,
    [id]
  );

  if (!session) return null;

  const points = await db.getAllAsync<GPSPoint>(
    `SELECT * FROM gps_points WHERE sessionId = ? ORDER BY timestamp ASC;`,
    [id]
  );

  return {
    ...session,
    points,
  };
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM gps_points WHERE sessionId = ?;`, [id]);
    await db.runAsync(`DELETE FROM sessions WHERE id = ?;`, [id]);
  });
}

export async function deleteAllHistory(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM gps_points;`);
    await db.runAsync(`DELETE FROM sessions;`);
    await db.runAsync(`DELETE FROM shared_walks;`);
    await db.runAsync(`DELETE FROM nearby_users;`);
  });
}

/* ============================================================================
 * STATISTICS DAO
 * ============================================================================ */

export async function getStatsSummary(period: 'today' | 'week' | 'month' | 'all' = 'all'): Promise<StatsSummary> {
  const db = await getDatabase();

  let timeFilterClause = `WHERE status = 'completed'`;
  const now = Date.now();

  if (period === 'today') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    timeFilterClause += ` AND startedAt >= ${startOfDay.getTime()}`;
  } else if (period === 'week') {
    const startOfWeek = now - 7 * 24 * 60 * 60 * 1000;
    timeFilterClause += ` AND startedAt >= ${startOfWeek}`;
  } else if (period === 'month') {
    const startOfMonth = now - 30 * 24 * 60 * 60 * 1000;
    timeFilterClause += ` AND startedAt >= ${startOfMonth}`;
  }

  const sessionStats = await db.getFirstAsync<{
    totalDistance: number;
    totalAreaClaimed: number;
    totalPaths: number;
    biggestArea: number;
    longestPath: number;
  }>(`
    SELECT 
      COALESCE(SUM(distance), 0) AS totalDistance,
      COALESCE(SUM(areaClaimed), 0) AS totalAreaClaimed,
      COUNT(id) AS totalPaths,
      COALESCE(MAX(areaClaimed), 0) AS biggestArea,
      COALESCE(MAX(distance), 0) AS longestPath
    FROM sessions ${timeFilterClause};
  `);

  const nearbyStats = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM nearby_users;`
  );

  const sharedWalkStats = await db.getFirstAsync<{
    walksTogetherCount: number;
    totalTimeTogether: number;
  }>(`
    SELECT 
      COUNT(id) as walksTogetherCount,
      COALESCE(SUM(duration), 0) as totalTimeTogether
    FROM shared_walks;
  `);

  const streak = await calculateCurrentStreak(db);

  return {
    totalDistance: sessionStats?.totalDistance || 0,
    totalAreaClaimed: sessionStats?.totalAreaClaimed || 0,
    totalPaths: sessionStats?.totalPaths || 0,
    biggestArea: sessionStats?.biggestArea || 0,
    longestPath: sessionStats?.longestPath || 0,
    currentStreak: streak,
    nearbyEncounters: nearbyStats?.count || 0,
    walksTogetherCount: sharedWalkStats?.walksTogetherCount || 0,
    totalTimeTogether: sharedWalkStats?.totalTimeTogether || 0,
  };
}

async function calculateCurrentStreak(db: SQLite.SQLiteDatabase): Promise<number> {
  const dates = await db.getAllAsync<{ dateStr: string }>(`
    SELECT DISTINCT strftime('%Y-%m-%d', startedAt / 1000, 'unixepoch', 'localtime') as dateStr
    FROM sessions
    WHERE status = 'completed'
    ORDER BY dateStr DESC;
  `);

  if (!dates || dates.length === 0) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let streak = 0;
  let checkDate = new Date();

  const topDate = dates[0].dateStr;
  if (topDate !== todayStr && topDate !== yesterdayStr) {
    return 0;
  }

  if (topDate === todayStr) {
    checkDate = new Date();
  } else {
    checkDate = yesterday;
  }

  const dateSet = new Set(dates.map((d) => d.dateStr));

  while (true) {
    const curStr = checkDate.toISOString().split('T')[0];
    if (dateSet.has(curStr)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/* ============================================================================
 * NEARBY & SHARED WALKS DAO
 * ============================================================================ */

export async function saveNearbyUser(user: NearbyUser): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO nearby_users (temporaryId, firstSeen, lastSeen, status, cooldownUntil)
     VALUES (?, ?, ?, ?, ?);`,
    [user.temporaryId, user.firstSeen, user.lastSeen, user.status, user.cooldownUntil]
  );
}

export async function saveSharedWalk(walk: SharedWalk): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO shared_walks (id, temporaryPeerId, startedAt, endedAt, duration)
     VALUES (?, ?, ?, ?, ?);`,
    [walk.id, walk.temporaryPeerId, walk.startedAt, walk.endedAt || Date.now(), walk.duration]
  );
}

/* ============================================================================
 * SETTINGS DAO
 * ============================================================================ */

export async function getSettings(): Promise<UserSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    discoverable: number;
    notificationsEnabled: number;
    units: string;
  }>(`SELECT discoverable, notificationsEnabled, units FROM settings WHERE id = 1;`);

  if (!row) {
    return { discoverable: true, notificationsEnabled: true, units: 'km' };
  }

  return {
    discoverable: Boolean(row.discoverable),
    notificationsEnabled: Boolean(row.notificationsEnabled),
    units: (row.units as 'km' | 'mi') || 'km',
  };
}

export async function updateSettings(settings: Partial<UserSettings>): Promise<void> {
  const db = await getDatabase();
  const current = await getSettings();
  const updated = { ...current, ...settings };

  await db.runAsync(
    `UPDATE settings SET discoverable = ?, notificationsEnabled = ?, units = ? WHERE id = 1;`,
    [updated.discoverable ? 1 : 0, updated.notificationsEnabled ? 1 : 0, updated.units]
  );
}
