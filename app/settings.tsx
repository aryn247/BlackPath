import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { useSettingsStore, SettingsStore } from '../store/settingsStore';
import { PermissionService, PermissionState } from '../services/permissions/PermissionService';
import { deleteAllHistory } from '../services/database/db';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();

  const [permissions, setPermissions] = useState<PermissionState>({
    foregroundLocation: false,
    backgroundLocation: false,
    bluetooth: true,
    notifications: false,
  });

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const p = await PermissionService.checkAllPermissions();
    setPermissions(p);
  };

  const handleToggleDiscoverable = (val: boolean) => {
    SettingsStore.update({ discoverable: val });
  };

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await PermissionService.requestNotifications();
      SettingsStore.update({ notificationsEnabled: granted });
      checkPermissions();
    } else {
      SettingsStore.update({ notificationsEnabled: false });
    }
  };

  const handleUnitChange = (unit: 'km' | 'mi') => {
    SettingsStore.update({ units: unit });
  };

  const handleDeleteHistory = () => {
    Alert.alert(
      'DELETE ALL HISTORY',
      'This will permanently delete all saved walks from this device. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllHistory();
            Alert.alert('History Cleared', 'All local sessions have been deleted.');
          },
        },
      ]
    );
  };

  const handleResetData = () => {
    Alert.alert(
      'RESET ALL LOCAL DATA',
      'This will wipe all history, settings, and temporary IDs from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Data',
          style: 'destructive',
          onPress: async () => {
            await deleteAllHistory();
            await SettingsStore.update({ discoverable: true, notificationsEnabled: true, units: 'km' });
            Alert.alert('Data Reset', 'BlackPath local storage has been reset.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SETTINGS</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* BLE Discovery Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SOCIAL & DISCOVERY</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelGroup}>
                <Text style={styles.settingTitle}>Nearby Discovery</Text>
                <Text style={styles.settingSubtitle}>
                  Allow nearby BlackPath users to discover you while walking.
                </Text>
              </View>
              <Switch
                value={settings.discoverable}
                onValueChange={handleToggleDiscoverable}
                trackColor={{ false: '#2C2C2E', true: Colors.peerPath }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* Notifications & Units */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCES</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Switch
                value={settings.notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#2C2C2E', true: '#FFFFFF' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <Text style={styles.settingTitle}>Units</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitOption, settings.units === 'km' && styles.unitOptionActive]}
                  onPress={() => handleUnitChange('km')}
                >
                  <Text style={[styles.unitText, settings.units === 'km' && styles.unitTextActive]}>
                    KM / M
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.unitOption, settings.units === 'mi' && styles.unitOptionActive]}
                  onPress={() => handleUnitChange('mi')}
                >
                  <Text style={[styles.unitText, settings.units === 'mi' && styles.unitTextActive]}>
                    MI / FT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Permissions Status */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PERMISSIONS STATUS</Text>
          <View style={styles.card}>
            <View style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>Fine Location</Text>
              <Text style={[styles.permissionStatus, permissions.foregroundLocation && styles.granted]}>
                {permissions.foregroundLocation ? 'GRANTED' : 'DENIED'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>Background Location</Text>
              <Text style={[styles.permissionStatus, permissions.backgroundLocation && styles.granted]}>
                {permissions.backgroundLocation ? 'GRANTED' : 'DENIED'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>Bluetooth</Text>
              <Text style={[styles.permissionStatus, permissions.bluetooth && styles.granted]}>
                {permissions.bluetooth ? 'ACTIVE' : 'OFF'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.permissionRow}>
              <Text style={styles.permissionLabel}>Notifications</Text>
              <Text style={[styles.permissionStatus, permissions.notifications && styles.granted]}>
                {permissions.notifications ? 'GRANTED' : 'DENIED'}
              </Text>
            </View>
          </View>
        </View>

        {/* Privacy Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>DATA & PRIVACY</Text>
          <View style={styles.privacyCard}>
            <Text style={styles.privacyPoint}>• Your walks are stored on this device.</Text>
            <Text style={styles.privacyPoint}>• BlackPath does not use a central location database.</Text>
            <Text style={styles.privacyPoint}>• Historical routes are never shared with nearby users.</Text>
          </View>
        </View>

        {/* Danger Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>STORAGE MANAGEMENT</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteHistory}>
            <Text style={styles.dangerButtonText}>DELETE ALL HISTORY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dangerButton} onPress={handleResetData}>
            <Text style={styles.dangerButtonText}>RESET LOCAL DATA</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutContainer}>
          <Text style={styles.aboutText}>BlackPath V1</Text>
          <Text style={styles.aboutSub}>Serverless • Privacy-First • Offline</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#121214',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 18,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabelGroup: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#1C1C1E',
    marginVertical: 14,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 2,
  },
  unitOption: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  unitOptionActive: {
    backgroundColor: '#FFFFFF',
  },
  unitText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
  },
  unitTextActive: {
    color: '#000000',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  permissionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E5E5EA',
  },
  permissionStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 1,
  },
  granted: {
    color: '#30D158',
  },
  privacyCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 18,
  },
  privacyPoint: {
    fontSize: 13,
    fontWeight: '400',
    color: '#E5E5EA',
    lineHeight: 22,
    marginBottom: 6,
  },
  dangerButton: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 1.5,
  },
  aboutContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  aboutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  aboutSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 4,
  },
});
