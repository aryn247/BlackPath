import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface PermissionState {
  foregroundLocation: boolean;
  backgroundLocation: boolean;
  bluetooth: boolean;
  notifications: boolean;
}

export class PermissionService {
  /**
   * Checks current permission statuses across location, notifications, and bluetooth.
   */
  static async checkAllPermissions(): Promise<PermissionState> {
    let foregroundLocation = false;
    let backgroundLocation = false;
    let notifications = false;
    let bluetooth = true; // Handled natively by BLE plugin / iOS plist

    try {
      const fgStatus = await Location.getForegroundPermissionsAsync();
      foregroundLocation = fgStatus.status === Location.PermissionStatus.GRANTED;

      const bgStatus = await Location.getBackgroundPermissionsAsync();
      backgroundLocation = bgStatus.status === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Error checking location permissions:', e);
    }

    try {
      const notifStatus = await Notifications.getPermissionsAsync();
      notifications = notifStatus.status === Notifications.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Error checking notification permissions:', e);
    }

    return {
      foregroundLocation,
      backgroundLocation,
      bluetooth,
      notifications,
    };
  }

  /**
   * Requests foreground location permission.
   */
  static async requestForegroundLocation(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Error requesting foreground location:', e);
      return false;
    }
  }

  /**
   * Requests background location permission.
   */
  static async requestBackgroundLocation(): Promise<boolean> {
    try {
      const fgGranted = await this.requestForegroundLocation();
      if (!fgGranted) return false;

      const { status } = await Location.requestBackgroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Error requesting background location:', e);
      return false;
    }
  }

  /**
   * Requests notification permissions.
   */
  static async requestNotifications(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      return status === Notifications.PermissionStatus.GRANTED;
    } catch (e) {
      console.warn('Error requesting notifications:', e);
      return false;
    }
  }
}
