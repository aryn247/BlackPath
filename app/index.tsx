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

export default function MainScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isStarting, setIsStarting] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  useEffect(() => {
    VersionCheckService.checkForUpdates();
  }, []);

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
  const bottomPadding = Math.max(insets.bottom, 16);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.logoTitle}>BLACKPATH</Text>
      </View>

      {/* Center Abstract Pulse Symbol */}
      <View style={styles.centerContent}>
        <View style={styles.outerGlowRing}>
          <View style={styles.innerGlowRing}>
            <View style={styles.centerPulseCircle} />
          </View>
        </View>

        <Text style={styles.tagline}>Walk. Draw. Discover. Connect.</Text>
      </View>

      {/* Start Walk Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.startWalkButton}
          activeOpacity={0.8}
          onPress={handleStartWalkPress}
          disabled={isStarting}
        >
          <Text style={styles.startWalkText}>
            {isStarting ? 'INITIALIZING...' : 'START WALK'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation Toolbar */}
      <View style={[styles.navToolbar, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/history')}
        >
          <Ionicons name="time-outline" size={22} color="#8E8E93" />
          <Text style={styles.navLabel}>HISTORY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/statistics')}
        >
          <Ionicons name="stats-chart-outline" size={22} color="#8E8E93" />
          <Text style={styles.navLabel}>STATS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={22} color="#8E8E93" />
          <Text style={styles.navLabel}>SETTINGS</Text>
        </TouchableOpacity>
      </View>

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
  outerGlowRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  innerGlowRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerPulseCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '600',
    color: '#48484A',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  actionContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  startWalkButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  startWalkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 3,
  },
  navToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#121214',
    paddingHorizontal: 10,
    backgroundColor: '#000000',
  },
  navButton: {
    alignItems: 'center',
    flex: 1,
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
