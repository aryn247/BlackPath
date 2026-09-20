import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { WalkStore } from '../store/walkStore';
import { PermissionService } from '../services/permissions/PermissionService';
import { VersionCheckService } from '../services/notifications/VersionCheckService';
import { Ionicons } from '@expo/vector-icons';

import { BottomNav } from '../components/BottomNav';

export default function MainScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isStarting, setIsStarting] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    VersionCheckService.checkForUpdates();
    WalkStore.restoreActiveSession().then((hasActiveSession) => {
      if (hasActiveSession) {
        router.replace('/walk');
      }
    });
  }, [router]);

  const handleStartWalkPress = async () => {
    setIsStarting(true);

    const perms = await PermissionService.checkAllPermissions();
    if (!perms.foregroundLocation) {
      setShowPermissionModal(true);
      setIsStarting(false);
      return;
    }

    await proceedStartWalk();
  };

  const proceedStartWalk = async () => {
    setShowPermissionModal(false);
    setIsStarting(true);

    // Request permissions if needed
    await PermissionService.requestForegroundLocation();
    await PermissionService.requestBackgroundLocation();
    await PermissionService.requestNotifications();

    const started = await WalkStore.startWalk();
    setIsStarting(false);

    if (started) {
      router.push('/walk');
    } else {
      Alert.alert(
        'GPS Permission Required',
        'BlackPath requires high-accuracy location tracking to draw your abstract path.'
      );
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 12;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.logoTitle}>B L A C K P A T H</Text>
      </View>

      {/* Center Large Circular Glowing Start Button (Mockup Screen 1) */}
      <View style={styles.centerContent}>
        <TouchableOpacity
          style={styles.circleStartButton}
          activeOpacity={0.8}
          onPress={handleStartWalkPress}
          disabled={isStarting}
        >
          <View style={styles.circleStartInner}>
            <Text style={styles.circleStartText}>
              {isStarting ? 'STARTING...' : 'START WALK'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Persistent Bottom Navigation Bar */}
      <BottomNav />

      {/* Permission Explanation Modal */}
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.permissionIconBadge}>
              <Ionicons name="location" size={28} color="#FFFFFF" />
            </View>

            <Text style={styles.modalTitle}>LOCATION PERMISSION</Text>
            <Text style={styles.modalBody}>
              BlackPath uses real high-accuracy GPS to draw your abstract glowing path in real-time.
              {'\n\n'}
              Your GPS history is stored locally on this device and is never uploaded or shared.
            </Text>

            <TouchableOpacity
              style={styles.modalGrantButton}
              activeOpacity={0.8}
              onPress={proceedStartWalk}
            >
              <Text style={styles.modalGrantText}>ENABLE GPS & START</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              activeOpacity={0.7}
              onPress={() => setShowPermissionModal(false)}
            >
              <Text style={styles.modalCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  logoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  circleStartButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  circleStartInner: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleStartText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  navLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 4,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  permissionIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 12,
  },
  modalBody: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalGrantButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalGrantText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 1.5,
  },
  modalCancelButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
});
