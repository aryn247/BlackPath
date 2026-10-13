import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VersionInfo {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
}

const VERSION_CHECK_URL = 'https://aryn247.github.io/Self-Portfolio/blackpath_version.json';
const CURRENT_VERSION_CODE = 5;
const CACHE_KEY = 'blackpath_last_version_check';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class VersionCheckService {
  /**
   * Checks remote version JSON at most once per 24 hours (M7: cached throttle).
   * Silently skips if checked recently or offline.
   */
  static async checkForUpdates(): Promise<void> {
    try {
      // M7 Fix: Only check once every 24 hours — don't hammer network on every launch
      const lastCheckStr = await AsyncStorage.getItem(CACHE_KEY);
      if (lastCheckStr) {
        const lastCheck = parseInt(lastCheckStr, 10);
        if (Date.now() - lastCheck < CACHE_TTL_MS) return;
      }

      const response = await fetch(VERSION_CHECK_URL);
      if (!response.ok) return;

      // Mark as checked now, before processing — avoids repeated prompts if fetch is slow
      await AsyncStorage.setItem(CACHE_KEY, String(Date.now()));

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
