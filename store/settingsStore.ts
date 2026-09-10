import { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getSettings, updateSettings } from '../services/database/db';
import { BLEService } from '../services/bluetooth/BLEService';

let globalSettings: UserSettings = {
  discoverable: true,
  notificationsEnabled: true,
  units: 'km',
};

const listeners: Set<(settings: UserSettings) => void> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...globalSettings }));
}

export const SettingsStore = {
  getSettings: () => globalSettings,

  loadSettings: async (): Promise<UserSettings> => {
    try {
      const stored = await getSettings();
      globalSettings = stored;
      BLEService.setDiscoverable(stored.discoverable);
      notifyListeners();
    } catch (e) {
      console.warn('Error loading settings from DB:', e);
    }
    return globalSettings;
  },

  update: async (partial: Partial<UserSettings>): Promise<UserSettings> => {
    globalSettings = { ...globalSettings, ...partial };
    if (partial.discoverable !== undefined) {
      BLEService.setDiscoverable(partial.discoverable);
    }
    notifyListeners();

    try {
      await updateSettings(partial);
    } catch (e) {
      console.warn('Error saving settings to DB:', e);
    }

    return globalSettings;
  },

  subscribe: (listener: (settings: UserSettings) => void) => {
    listeners.add(listener);
    listener({ ...globalSettings });
    return () => listeners.delete(listener);
  },
};

export function useSettingsStore(): UserSettings {
  const [settings, setSettings] = useState<UserSettings>(SettingsStore.getSettings());

  useEffect(() => {
    SettingsStore.loadSettings();
    const unsubscribe = SettingsStore.subscribe(setSettings);
    return () => {
      unsubscribe();
    };
  }, []);

  return settings;
}
