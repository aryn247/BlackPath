import { useState, useEffect } from 'react';
import { GPSPoint, NearbyUser, WalkSession, WalkStatus } from '../types';
import { calculatePace, calculateTotalDistance } from '../geo/distance';
import { smoothPath } from '../geo/smoothing';
import { detectLoop } from '../geo/loopDetection';
import { calculateClosedLoopArea } from '../geo/area';
import { LocationService } from '../services/location/LocationService';
import { BLEService } from '../services/bluetooth/BLEService';
import { saveSession, saveSharedWalk } from '../services/database/db';

export interface WalkState {
  status: WalkStatus;
  startedAt: number;
  duration: number;
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

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...globalWalkState }));
}

export function getWalkState(): WalkState {
  return globalWalkState;
}

export const WalkStore = {
  getState: getWalkState,

  subscribe: (listener: (state: WalkState) => void) => {
    listeners.add(listener);
    listener({ ...globalWalkState });
    return () => listeners.delete(listener);
  },

  /**
   * Starts a new walk session with GPS tracking & BLE discovery.
   */
  startWalk: async (): Promise<boolean> => {
    globalWalkState = {
      ...initialState,
      status: 'walking',
      startedAt: Date.now(),
    };
    notifyListeners();

    // Start Location Service
    const trackingStarted = await LocationService.startTracking((point) => {
      WalkStore.addPoint(point);
    });

    if (!trackingStarted) {
      globalWalkState.status = 'idle';
      notifyListeners();
      return false;
    }

    // Start BLE Service
    BLEService.startBLESession();

    // Listen for nearby BLE peers
    BLEService.onPeerDiscovered((peer) => {
      if (globalWalkState.status === 'walking' && !globalWalkState.activePeer) {
        globalWalkState.incomingInvitePeer = peer;
        notifyListeners();
      }
    });

    // Start Duration Timer
    if (durationTimer) clearInterval(durationTimer);
    durationTimer = setInterval(() => {
      if (globalWalkState.status === 'walking') {
        globalWalkState.duration += 1;
        globalWalkState.averagePace = calculatePace(
          globalWalkState.distance,
          globalWalkState.duration,
          'km'
        );
        notifyListeners();
      }
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

    // Check loop closure and enclosed area
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
      averagePace: calculatePace(newDistance, globalWalkState.duration, 'km'),
    };

    // If shared walk is active, generate relative peer path point for violet glow
    if (globalWalkState.isSharedWalk && globalWalkState.activePeer) {
      WalkStore.updatePeerProximityPoint(point);
    }

    notifyListeners();
  },

  /**
   * Generates continuous peer visual path offset for dual glowing path rendering.
   */
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

  /**
   * User accepts or initiates a shared walk session.
   */
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

  /**
   * User declines or dismisses nearby peer prompt ("NOT NOW").
   */
  declineNearbyPeer: (peerId: string) => {
    BLEService.setPeerCooldown(peerId);
    globalWalkState.incomingInvitePeer = null;
    notifyListeners();
  },

  /**
   * Leaves active shared walk session and returns to solo tracking.
   */
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
   * Stops active walk, saves final data to SQLite, and computes summary statistics.
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

    const finalPoints = globalWalkState.smoothedPoints.length > 0
      ? globalWalkState.smoothedPoints
      : globalWalkState.points;

    const finalDistance = calculateTotalDistance(finalPoints);
    const finalDuration = globalWalkState.duration;
    const finalPace = calculatePace(finalDistance, finalDuration, 'km');

    // Final Loop Check
    const loopResult = detectLoop(finalPoints, 25, 100);
    const finalArea = loopResult.isLoop ? calculateClosedLoopArea(finalPoints) : globalWalkState.areaClaimed;

    const session: WalkSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      startedAt: globalWalkState.startedAt,
      endedAt: Date.now(),
      distance: finalDistance,
      duration: finalDuration,
      averagePace: finalPace,
      pathLength: finalPoints.length,
      areaClaimed: finalArea,
      points: finalPoints,
    };

    // Save session to SQLite
    await saveSession(session, finalPoints);

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

/**
 * Custom React Hook for connecting components to WalkStore state.
 */
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
