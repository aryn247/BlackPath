import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { GPSPoint } from '../../types';
import { isValidGPSPoint } from '../../geo/smoothing';

export const LOCATION_TASK_NAME = 'BLACKPATH_BACKGROUND_LOCATION';

type LocationSubscriber = (point: GPSPoint) => void;

class LocationServiceManager {
  private subscribers: Set<LocationSubscriber> = new Set();
  private foregroundSubscription: Location.LocationSubscription | null = null;
  private isTrackingActive: boolean = false;
  private lastPoint: GPSPoint | null = null;

  constructor() {
    this.registerBackgroundTask();
  }

  /**
   * Registers Expo TaskManager background location task.
   */
  private registerBackgroundTask() {
    if (TaskManager.isTaskDefined(LOCATION_TASK_NAME)) return;

    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('Background location task error:', error);
        return;
      }
      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0) {
          for (const loc of locations) {
            this.handleLocationUpdate(loc);
          }
        }
      }
    });
  }

  /**
   * Processes an incoming raw LocationObject from GPS.
   */
  public handleLocationUpdate(locationObj: Location.LocationObject) {
    const point: GPSPoint = {
      latitude: locationObj.coords.latitude,
      longitude: locationObj.coords.longitude,
      timestamp: locationObj.timestamp || Date.now(),
      accuracy: locationObj.coords.accuracy || 0,
      speed: locationObj.coords.speed,
      altitude: locationObj.coords.altitude,
    };

    if (isValidGPSPoint(point, this.lastPoint || undefined)) {
      this.lastPoint = point;
      this.subscribers.forEach((callback) => callback(point));
    }
  }

  /**
   * Starts high accuracy foreground and background location tracking.
   */
  public async startTracking(onPointReceived: LocationSubscriber): Promise<boolean> {
    this.subscribers.add(onPointReceived);
    if (this.isTrackingActive) return true;

    try {
      const fgStatus = await Location.getForegroundPermissionsAsync();
      if (fgStatus.status !== Location.PermissionStatus.GRANTED) {
        const reqFg = await Location.requestForegroundPermissionsAsync();
        if (reqFg.status !== Location.PermissionStatus.GRANTED) {
          return false;
        }
      }

      // Start Foreground Subscription
      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1500, // Every 1.5s
          distanceInterval: 2, // Every 2 meters
        },
        (location) => this.handleLocationUpdate(location)
      );

      // Start Background Task if permitted
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
              notificationBody: 'Drawing your path on black screen...',
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
      this.subscribers.delete(onPointReceived);
    }

    if (this.subscribers.size === 0) {
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
      this.lastPoint = null;
    }
  }
}

export const LocationService = new LocationServiceManager();
