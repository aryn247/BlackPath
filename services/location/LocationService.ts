import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GPSPoint } from '../../types';
import { isValidGPSPoint } from '../../geo/smoothing';
import { getActiveSession, insertBackgroundGPSPoint } from '../database/db';

export const LOCATION_TASK_NAME = 'BLACKPATH_BACKGROUND_LOCATION';

type LocationSubscriber = (point: GPSPoint) => void;

let activeSessionId: string | null = null;
let lastPoint: GPSPoint | null = null;
const globalSubscribers: Set<LocationSubscriber> = new Set();

/**
 * Module-scope TaskManager registration.
 * Runs in background thread independent of React component mounting or JS event loop state.
 */
if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
  TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }

    if (data) {
      const { locations } = data as { locations: Location.LocationObject[] };
      if (!locations || locations.length === 0) return;

      // Query active session directly from SQLite
      const activeSession = await getActiveSession();
      if (!activeSession) return;

      for (const loc of locations) {
        const point: GPSPoint = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp || Date.now(),
          accuracy: loc.coords.accuracy || 0,
          speed: loc.coords.speed,
          altitude: loc.coords.altitude,
        };

        if (isValidGPSPoint(point, lastPoint || undefined)) {
          lastPoint = point;

          // DIRECT SQLITE PERSISTENCE
          await insertBackgroundGPSPoint(activeSession.id, point);

          // Notify in-memory subscribers if UI is active
          globalSubscribers.forEach((cb) => cb(point));
        }
      }
    }
  });
}

class LocationServiceManager {
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private isTrackingActive: boolean = false;

  public setActiveSessionId(sessionId: string | null) {
    activeSessionId = sessionId;
  }

  /**
   * Processes raw foreground location updates.
   */
  public async handleLocationUpdate(locationObj: Location.LocationObject) {
    const point: GPSPoint = {
      latitude: locationObj.coords.latitude,
      longitude: locationObj.coords.longitude,
      timestamp: locationObj.timestamp || Date.now(),
      accuracy: locationObj.coords.accuracy || 0,
      speed: locationObj.coords.speed,
      altitude: locationObj.coords.altitude,
    };

    if (isValidGPSPoint(point, lastPoint || undefined)) {
      lastPoint = point;

      const activeSession = await getActiveSession();
      if (activeSession) {
        await insertBackgroundGPSPoint(activeSession.id, point);
      }

      globalSubscribers.forEach((callback) => callback(point));
    }
  }

  /**
   * Starts high accuracy foreground and background location tracking.
   */
  public async startTracking(sessionId: string, onPointReceived: LocationSubscriber): Promise<boolean> {
    globalSubscribers.add(onPointReceived);
    activeSessionId = sessionId;

    try {
      const fgStatus = await Location.getForegroundPermissionsAsync();
      if (fgStatus.status !== Location.PermissionStatus.GRANTED) {
        const reqFg = await Location.requestForegroundPermissionsAsync();
        if (reqFg.status !== Location.PermissionStatus.GRANTED) {
          return false;
        }
      }

      // Start Foreground Watch Position
      if (!this.foregroundSubscription) {
        this.foregroundSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1500,
            distanceInterval: 2,
          },
          (location) => this.handleLocationUpdate(location)
        );
      }

      // Start Native Background Task & Foreground Service
      const bgStatus = await Location.getBackgroundPermissionsAsync();
      if (bgStatus.status === Location.PermissionStatus.GRANTED) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 2,
            showsBackgroundLocationIndicator: true,
            foregroundService: {
              notificationTitle: 'BlackPath Active Walk',
              notificationBody: 'Tracking your path in background...',
              notificationColor: '#000000',
            },
          });
        }
      }

      this.isTrackingActive = true;
      return true;
    } catch (e) {
      console.error('Failed to start location tracking:', e);
      return false;
    }
  }

  /**
   * Stops tracking and cleans up subscriptions.
   */
  public async stopTracking(onPointReceived?: LocationSubscriber) {
    if (onPointReceived) {
      globalSubscribers.delete(onPointReceived);
    }

    if (globalSubscribers.size === 0) {
      if (this.foregroundSubscription) {
        this.foregroundSubscription.remove();
        this.foregroundSubscription = null;
      }

      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      } catch (e) {
        console.warn('Error stopping background location task:', e);
      }

      this.isTrackingActive = false;
      activeSessionId = null;
      lastPoint = null;
    }
  }
}

export const LocationService = new LocationServiceManager();
