import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
}

const VERSION_CHECK_URL = 'https://aryn247.github.io/Self-Portfolio/blackpath_version.json';
const CURRENT_VERSION_CODE = 3;

export class VersionCheckService {
  /**
   * Checks remote version JSON on app launch (serverless static endpoint).
   */
  static async checkForUpdates(): Promise<void> {
    try {
      const response = await fetch(VERSION_CHECK_URL);
      if (!response.ok) return;

      const info: VersionInfo = await response.json();

      if (info && info.versionCode > CURRENT_VERSION_CODE) {
        Alert.alert(
          `UPDATE AVAILABLE (${info.versionName})`,
          `${info.releaseNotes}\n\nWould you like to download the latest APK?`,
          [
            { text: 'Later', style: 'cancel' },
            {
              text: 'UPDATE NOW',
              onPress: () => {
                if (info.downloadUrl) {
                  Linking.openURL(info.downloadUrl);
                }
              },
            },
          ]
        );
      }
    } catch (e) {
      // Offline fallback: silences network errors cleanly
    }
  }
}
