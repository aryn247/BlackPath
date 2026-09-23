import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { useWalkStore, WalkStore } from '../store/walkStore';
import { useSettingsStore } from '../store/settingsStore';
import { PathRenderer } from '../components/PathRenderer';
import { WalkStats } from '../components/WalkStats';
import { NearbyUserPrompt } from '../components/NearbyUserPrompt';
import { JoinRequest } from '../components/JoinRequest';
import { SharedWalkView } from '../components/SharedWalkView';
import { formatArea, formatDistance, formatDuration, formatPace } from '../geo/distance';
import { BLEService } from '../services/bluetooth/BLEService';
import { WalkSession } from '../types';

import { BottomNav } from '../components/BottomNav';

export default function WalkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const walkState = useWalkStore();
  const settings = useSettingsStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [savedSession, setSavedSession] = useState<WalkSession | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const canvasWidth = windowWidth;
  const canvasHeight = windowHeight * 0.48;

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 8;

  // Handle Stop Walk Action
  const handleStopWalk = async () => {
    setIsStopping(true);
    try {
      const session = await WalkStore.stopWalk();
      if (session) {
        setSavedSession(session);
        setShowSummaryModal(true);
      } else {
        router.replace('/');
      }
    } catch (e) {
      console.error('Error stopping walk:', e);
      router.replace('/');
    } finally {
      setIsStopping(false);
    }
  };

  // Handle Save & Finish Summary
  const handleSaveSummary = () => {
    setShowSummaryModal(false);
    WalkStore.resetState();
    router.replace('/history');
  };

  const handleDiscardSummary = () => {
    setShowSummaryModal(false);
    WalkStore.resetState();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Top 2x2 Metric Grid (Mockup Screens 2 & 3) */}
      <View style={[styles.topMetricHeader, { paddingTop: topPadding }]}>
        <WalkStats
          distanceMeters={walkState.distance}
          durationSeconds={walkState.duration}
          paceSeconds={walkState.averagePace}
          areaClaimedSqMeters={walkState.areaClaimed}
          units={settings.units}
        />
        {walkState.isLoopClosed && (
          <View style={styles.loopBadge}>
            <Text style={styles.loopBadgeText}>CLOSED LOOP DETECTED</Text>
          </View>
        )}
      </View>

      {/* Main GPS Abstract Glowing Path Canvas */}
      <View style={styles.canvasContainer}>
        <PathRenderer
          userPoints={walkState.smoothedPoints}
          peerPoints={walkState.peerPoints}
          width={canvasWidth}
          height={canvasHeight}
          showGlow={true}
          showEndpoint={true}
        />
      </View>

      {/* Peer System Overlays (BLE) */}
      {walkState.incomingInvitePeer && !walkState.isSharedWalk && (
        <NearbyUserPrompt
          peer={walkState.incomingInvitePeer}
          onJoin={(peerId) => {
            BLEService.sendJoinRequest(peerId);
            WalkStore.startSharedWalk(walkState.incomingInvitePeer!);
          }}
          onNotNow={(peerId) => WalkStore.declineNearbyPeer(peerId)}
        />
      )}

      {walkState.isSharedWalk && (
        <SharedWalkView
          sharedDurationSeconds={walkState.sharedWalkDuration}
          estimatedDistanceMeters={24}
          onLeaveWalk={() => WalkStore.leaveSharedWalk()}
        />
      )}

      {/* Compact Circular Red Stop Button (Mockup Screens 2 & 3) */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.circleStopButton}
          activeOpacity={0.8}
          onPress={handleStopWalk}
          disabled={isStopping}
        >
          <Text style={styles.circleStopText}>
            {isStopping ? '...' : 'STOP'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Persistent Bottom Nav Bar */}
      <BottomNav />

      {/* Walk Complete Summary Modal (Mockup Screen 9) */}
      <Modal
        visible={showSummaryModal}
        transparent={false}
        animationType="slide"
        onRequestClose={handleSaveSummary}
      >
        <View style={[styles.summaryContainer, { paddingTop: topPadding }]}>
          <ScrollView contentContainerStyle={styles.summaryContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.summaryHeaderTitle}>WALK COMPLETE</Text>

            {/* Miniature Path Preview */}
            {savedSession?.points && savedSession.points.length > 0 && (
              <View style={styles.summaryPathPreview}>
                <PathRenderer
                  userPoints={savedSession.points}
                  width={windowWidth - 48}
                  height={180}
                  showGlow={true}
                  showEndpoint={false}
                  padding={20}
                />
              </View>
            )}

            {/* 2x2 Summary Metrics Grid */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryValueLarge}>
                  {formatDistance(savedSession?.distance || 0, settings.units)}
                </Text>
                <Text style={styles.summaryLabel}>Distance</Text>
              </View>

              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryValueLarge}>
                  {formatDuration(savedSession?.duration || 0)}
                </Text>
                <Text style={styles.summaryLabel}>Duration</Text>
              </View>
            </View>

            <View style={[styles.summaryGrid, { marginTop: 12 }]}>
              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryValueSmall}>
                  {formatPace(savedSession?.averagePace || 0, settings.units)}
                </Text>
                <Text style={styles.summaryLabel}>Average Pace</Text>
              </View>

              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryValueSmall}>
                  {(savedSession?.areaClaimed || 0) > 0 ? formatArea(savedSession?.areaClaimed || 0) : '--'}
                </Text>
                <Text style={styles.summaryLabel}>Area Claimed</Text>
              </View>
            </View>

            {/* Social Rows */}
            <View style={styles.summaryPeerCard}>
              <View style={styles.peerSummaryRow}>
                <Text style={styles.peerSummaryLabel}>Nearby Users Encountered</Text>
                <Text style={styles.peerSummaryValue}>{walkState.activePeer ? 1 : 0}</Text>
              </View>
              {walkState.sharedWalkDuration > 0 && (
                <View style={[styles.peerSummaryRow, { marginTop: 8 }]}>
                  <Text style={styles.peerSummaryLabel}>Walked Together</Text>
                  <Text style={styles.peerSummaryValue}>
                    {formatDuration(walkState.sharedWalkDuration)}
                  </Text>
                </View>
              )}
            </View>

            {/* Action Buttons: SAVE & DISCARD */}
            <TouchableOpacity
              style={styles.summarySaveButton}
              activeOpacity={0.8}
              onPress={handleSaveSummary}
            >
              <Text style={styles.summarySaveText}>SAVE</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.summaryDiscardButton}
              activeOpacity={0.8}
              onPress={handleDiscardSummary}
            >
              <Text style={styles.summaryDiscardText}>DISCARD</Text>
            </TouchableOpacity>
          </ScrollView>
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
  topMetricHeader: {
    alignItems: 'center',
    width: '100%',
  },
  loopBadge: {
    marginTop: 4,
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  loopBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#30D158',
    letterSpacing: 1.5,
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  circleStopButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  circleStopText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },

  // Summary Modal Styles
  summaryContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  summaryHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  summaryGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  summaryValueLarge: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FFFFFF',
  },
  summaryValueSmall: {
    fontSize: 18,
    fontWeight: '400',
    color: '#E5E5EA',
  },
  summaryPeerCard: {
    width: '100%',
    backgroundColor: '#0F0E14',
    borderWidth: 1,
    borderColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
  },
  peerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  peerSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  peerSummaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  summaryPathPreview: {
    width: '100%',
    height: 180,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
    marginBottom: 20,
  },
  summarySaveButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  summarySaveText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 3,
  },
  summaryDiscardButton: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  summaryDiscardText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FF3B30',
    letterSpacing: 3,
  },
});
