import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export class NotificationService {
  /**
   * Triggers a local notification when a nearby BlackPath user is discovered.
   */
  static async sendNearbyUserNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'A BLACKPATH USER IS NEARBY',
          body: 'Would you like to join their walk?',
          data: { type: 'NEARBY_DISCOVERY' },
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.warn('Error sending nearby notification:', e);
    }
  }

  /**
   * Triggers a local notification when a Join Invitation is received.
   */
  static async sendJoinInvitationNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'SOMEONE WOULD LIKE TO JOIN YOUR WALK',
          body: 'Tap to respond to the invitation.',
          data: { type: 'JOIN_INVITATION' },
        },
        trigger: null, // immediate
      });
    } catch (e) {
      console.warn('Error sending invitation notification:', e);
    }
  }
}
