export interface GPSPoint {
  id?: string;
  sessionId?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  speed: number | null;
  altitude: number | null;
}

export interface WalkSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  distance: number; // in meters
  duration: number; // in seconds
  averagePace: number; // seconds per kilometer
  pathLength: number; // total points count
  areaClaimed: number; // in square meters (0 if no loop)
  status?: 'active' | 'completed';
  points?: GPSPoint[];
}

export type PeerStatus = 'discovered' | 'invited' | 'connected' | 'declined' | 'cooldown';

export interface NearbyUser {
  temporaryId: string;
  firstSeen: number;
  lastSeen: number;
  status: PeerStatus;
  cooldownUntil: number;
  distanceMeters?: number;
}

export interface SharedWalk {
  id: string;
  temporaryPeerId: string;
  startedAt: number;
  endedAt?: number;
  duration: number; // seconds walked together
}

export type UnitSystem = 'km' | 'mi';

export interface UserSettings {
  discoverable: boolean;
  notificationsEnabled: boolean;
  units: UnitSystem;
}

export type WalkStatus = 'idle' | 'walking' | 'paused' | 'completed';

export interface StatsSummary {
  totalDistance: number; // meters
  totalAreaClaimed: number; // sq meters
  totalPaths: number;
  biggestArea: number; // sq meters
  longestPath: number; // meters
  currentStreak: number; // days
  nearbyEncounters: number;
  walksTogetherCount: number;
  totalTimeTogether: number; // seconds
}
