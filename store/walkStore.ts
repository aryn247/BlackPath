import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { GPSPoint, NearbyUser, WalkSession, WalkStatus } from '../types';
import { calculatePace, calculateTotalDistance } from '../geo/distance';
import { smoothPath } from '../geo/smoothing';
import { detectLoop } from '../geo/loopDetection';
import { calculateClosedLoopArea } from '../geo/area';
import { LocationService } from '../services/location/LocationService';
import { BLEService } from '../services/bluetooth/BLEService';
import { completeSession, createActiveSession, getActiveSession, saveSharedWalk } from '../services/database/db';

export interface WalkState {
  status: WalkStatus;
  sessionId: string;
  startedAt: number;
  duration: number; // elapsed seconds
  distance: number; // meters
  averagePace: number; // sec / km
  isLoopClosed: boolean;
  areaClaimed: number; // sq meters
  points: GPSPoint[];
  smoothedPoints: GPSPoint[];

  // Peer / Shared Walk state
  activePeer: NearbyUser | null;
  incomingInvitePeer: NearbyUser | null;
  isSharedWalk: boolean;
  sharedWalkDuration: number;
  peerPoints: GPSPoint[];
}

const initialState: WalkState = {
  status: 'idle',
  sessionId: '',
  startedAt: 0,
  duration: 0,
  distance: 0,
  averagePace: 0,
  isLoopClosed: false,
  areaClaimed: 0,
  points: [],
  smoothedPoints: [],
  activePeer: null,
  incomingInvitePeer: null,
  isSharedWalk: false,
  sharedWalkDuration: 0,
  peerPoints: [],
};

let globalWalkState: WalkState = { ...initialState };
const listeners: Set<(state: WalkState) => void> = new Set();

let durationTimer: any = null;
let sharedDurationTimer: any = null;
let isAppStateSubscribed = false;

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...globalWalkState }));
}

export function getWalkState(): WalkState {
  return globalWalkState;
}

/**
 * Recalculates elapsed time, distance, and path from SQLite state.
 * Independent of JS setInterval or screen lock suspension.
 */
function syncActiveStateWithTime() {
  if (globalWalkState.status !== 'walking' || !globalWalkState.startedAt) return;

  const now = Date.now();
  const elapsed = Math.max(0, Math.floor((now - globalWalkState.startedAt) / 1000));
  globalWalkState.duration = elapsed;
  globalWalkState.averagePace = calculatePace(globalWalkState.distance, elapsed, 'km');
  notifyListeners();
}

/**
 * AppState listener: When returning from background or unlocking phone,
 * re-fetches points saved by background task to SQLite and updates UI immediately.
 */
function setupAppStateListener() {
  if (isAppStateSubscribed) return;
  isAppStateSubscribed = true;

  AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && globalWalkState.status === 'walking') {
      await WalkStore.syncBackgroundGPSPoints();
      syncActiveStateWithTime();
    }
  });
}

export const WalkStore = {
  getState: getWalkState,

  subscribe: (listener: (state: WalkState) => void) => {
    listeners.add(listener);
    listener({ ...globalWalkState });
    return () => listeners.delete(listener);
  },

  /**
   * Checks SQLite for an uncompleted active session on app startup or crash recovery.
   */
  restoreActiveSession: async (): Promise<boolean> => {
    setupAppStateListener();

    try {
      const activeSession = await getActiveSession();
      if (!activeSession) return false;

      const points = activeSession.points || [];
      const smoothed = smoothPath(points, 3);
      const totalDist = calculateTotalDistance(points);
      const elapsed = Math.max(0, Math.floor((Date.now() - activeSession.startedAt) / 1000));

      const loopResult = detectLoop(smoothed, 25, 100);
      const area = loopResult.isLoop ? calculateClosedLoopArea(smoothed) : 0;

      globalWalkState = {
        ...initialState,
        status: 'walking',
        sessionId: activeSession.id,
        startedAt: activeSession.startedAt,
        duration: elapsed,
        distance: totalDist,
        averagePace: calculatePace(totalDist, elapsed, 'km'),
        points,
        smoothedPoints: smoothed,
        isLoopClosed: loopResult.isLoop,
        areaClaimed: area,
      };

      notifyListeners();

      // Reconnect background location tracker
      await LocationService.startTracking(activeSession.id, (point) => {
        WalkStore.addPoint(point);
      });

      // Start timer tick for live UI updates
      if (durationTimer) clearInterval(durationTimer);
      durationTimer = setInterval(() => {
        syncActiveStateWithTime();
      }, 1000);

      return true;
    } catch (e) {
      console.warn('Error restoring active session:', e);
      return false;
    }
  },

  /**
   * Reloads all GPS points saved to SQLite by background task while app was minimized.
   */
  syncBackgroundGPSPoints: async () => {
    if (globalWalkState.status !== 'walking' || !globalWalkState.sessionId) return;

    try {
      const activeSession = await getActiveSession();
      if (activeSession && activeSession.points) {
        const newPoints = activeSession.points;
        const newDistance = calculateTotalDistance(newPoints);
        const newSmoothed = smoothPath(newPoints, 3);

        const loopResult = detectLoop(newSmoothed, 25, 100);
        const newArea = loopResult.isLoop ? calculateClosedLoopArea(newSmoothed) : globalWalkState.areaClaimed;

        globalWalkState = {
          ...globalWalkState,
          points: newPoints,
          smoothedPoints: newSmoothed,
          distance: newDistance,
          isLoopClosed: loopResult.isLoop,
          areaClaimed: newArea,
        };

        syncActiveStateWithTime();
      }
    } catch (e) {
      console.warn('Error syncing background GPS points from SQLite:', e);
    }
  },

  /**
   * Starts a new walk session with SQLite persistence & BLE discovery.
   */
  startWalk: async (): Promise<boolean> => {
    setupAppStateListener();

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startedAt = Date.now();

    // PERSIST ACTIVE SESSION IMMEDIATELY IN SQLITE
    await createActiveSession(sessionId, startedAt);

    globalWalkState = {
      ...initialState,
      status: 'walking',
      sessionId,
      startedAt,
    };
    notifyListeners();

    // Start Location Service
    const trackingStarted = await LocationService.startTracking(sessionId, (point) => {
      WalkStore.addPoint(point);
    });

    if (!trackingStarted) {
      globalWalkState.status = 'idle';
      notifyListeners();
      return false;
    }

    // Start BLE Service
    BLEService.startBLESession();

    BLEService.onPeerDiscovered((peer) => {
      if (globalWalkState.status === 'walking' && !globalWalkState.activePeer) {
        globalWalkState.incomingInvitePeer = peer;
        notifyListeners();
      }
    });

    // Start Duration Timer for live UI
    if (durationTimer) clearInterval(durationTimer);
    durationTimer = setInterval(() => {
      syncActiveStateWithTime();
    }, 1000);

    return true;
  },

  /**
   * Appends an incoming filtered GPS point to active session state.
   */
  addPoint: (point: GPSPoint) => {
    if (globalWalkState.status !== 'walking') return;

    const newPoints = [...globalWalkState.points, point];
    const newDistance = calculateTotalDistance(newPoints);
    const newSmoothed = smoothPath(newPoints, 3);

    const loopResult = detectLoop(newSmoothed, 25, 100);
    let newArea = globalWalkState.areaClaimed;
    let isClosed = globalWalkState.isLoopClosed;

    if (loopResult.isLoop) {
      isClosed = true;
      newArea = calculateClosedLoopArea(newSmoothed);
    }

    globalWalkState = {
      ...globalWalkState,
      points: newPoints,
      smoothedPoints: newSmoothed,
      distance: newDistance,
      isLoopClosed: isClosed,
      areaClaimed: newArea,
    };

    syncActiveStateWithTime();

    if (globalWalkState.isSharedWalk && globalWalkState.activePeer) {
      WalkStore.updatePeerProximityPoint(point);
    }
  },

  updatePeerProximityPoint: (userPoint: GPSPoint) => {
    const peerOffsetLat = userPoint.latitude + (Math.random() - 0.5) * 0.00015;
    const peerOffsetLon = userPoint.longitude + (Math.random() - 0.5) * 0.00015;

    const peerPoint: GPSPoint = {
      latitude: peerOffsetLat,
      longitude: peerOffsetLon,
      timestamp: Date.now(),
      accuracy: 5,
      speed: userPoint.speed,
      altitude: userPoint.altitude,
    };

    globalWalkState.peerPoints = [...globalWalkState.peerPoints, peerPoint];
  },

  startSharedWalk: (peer: NearbyUser) => {
    globalWalkState.activePeer = peer;
    globalWalkState.incomingInvitePeer = null;
    globalWalkState.isSharedWalk = true;
    globalWalkState.sharedWalkDuration = 0;

    if (sharedDurationTimer) clearInterval(sharedDurationTimer);
    sharedDurationTimer = setInterval(() => {
      if (globalWalkState.isSharedWalk) {
        globalWalkState.sharedWalkDuration += 1;
        notifyListeners();
      }
    }, 1000);

    notifyListeners();
  },

  declineNearbyPeer: (peerId: string) => {
    BLEService.setPeerCooldown(peerId);
    globalWalkState.incomingInvitePeer = null;
    notifyListeners();
  },

  leaveSharedWalk: async () => {
    if (!globalWalkState.isSharedWalk) return;

    if (sharedDurationTimer) {
      clearInterval(sharedDurationTimer);
      sharedDurationTimer = null;
    }

    if (globalWalkState.activePeer) {
      await saveSharedWalk({
        id: `sw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        temporaryPeerId: globalWalkState.activePeer.temporaryId,
        startedAt: Date.now() - globalWalkState.sharedWalkDuration * 1000,
        endedAt: Date.now(),
        duration: globalWalkState.sharedWalkDuration,
      });
    }

    globalWalkState.isSharedWalk = false;
    globalWalkState.activePeer = null;
    globalWalkState.peerPoints = [];
    notifyListeners();
  },

  /**
   * Stops active walk, saves final completed session in SQLite, and cleans up tracking.
   */
  stopWalk: async (): Promise<WalkSession | null> => {
    if (globalWalkState.status === 'idle') return null;

    if (durationTimer) {
      clearInterval(durationTimer);
      durationTimer = null;
    }

    if (globalWalkState.isSharedWalk) {
      await WalkStore.leaveSharedWalk();
    }

    await LocationService.stopTracking();
    BLEService.stopBLESession();

    // Re-sync final points from SQLite
    await WalkStore.syncBackgroundGPSPoints();

    const finalPoints = globalWalkState.smoothedPoints.length > 0
      ? globalWalkState.smoothedPoints
      : globalWalkState.points;

    const finalDistance = calculateTotalDistance(finalPoints);
    const finalDuration = Math.max(0, Math.floor((Date.now() - globalWalkState.startedAt) / 1000));
    const finalPace = calculatePace(finalDistance, finalDuration, 'km');

    const loopResult = detectLoop(finalPoints, 25, 100);
    const finalArea = loopResult.isLoop ? calculateClosedLoopArea(finalPoints) : globalWalkState.areaClaimed;

    const session: WalkSession = {
      id: globalWalkState.sessionId,
      startedAt: globalWalkState.startedAt,
      endedAt: Date.now(),
      distance: finalDistance,
      duration: finalDuration,
      averagePace: finalPace,
      pathLength: finalPoints.length,
      areaClaimed: finalArea,
      status: 'completed',
      points: finalPoints,
    };

    // COMPLETE SESSION IN SQLITE
    await completeSession(session, finalPoints);

    globalWalkState = {
      ...initialState,
      status: 'completed',
    };
    notifyListeners();

    return session;
  },

  resetState: () => {
    globalWalkState = { ...initialState };
    notifyListeners();
  },
};

export function useWalkStore(): WalkState {
  const [state, setState] = useState<WalkState>(WalkStore.getState());

  useEffect(() => {
    const unsubscribe = WalkStore.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return state;
}
