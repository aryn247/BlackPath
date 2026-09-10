import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
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

export default function WalkScreen() {
  const router = useRouter();
  const walkState = useWalkStore();
  const settings = useSettingsStore();

  const [savedSession, setSavedSession] = useState<WalkSession | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const canvasWidth = Dimensions.get('window').width;
  const canvasHeight = Dimensions.get('window').height * 0.52;

  // Handle Stop Walk Action
  const handleStopWalk = async () => {
    setIsStopping(true);
    const session = await WalkStore.stopWalk();
    setIsStopping(false);

    if (session) {
      setSavedSession(session);
      setShowSummaryModal(true);
    } else {
      router.replace('/');
    }
  };

  // Handle Save & Finish Summary
  const handleSaveSummary = () => {
    setShowSummaryModal(false);
    WalkStore.resetState();
    router.replace('/history');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {walkState.isSharedWalk ? 'SHARED WALK' : 'BLACKPATH'}
        </Text>
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

      {/* Live Stats Display Component */}
      <View style={styles.statsContainer}>
        <WalkStats
          distanceMeters={walkState.distance}
          durationSeconds={walkState.duration}
          paceSeconds={walkState.averagePace}
          areaClaimedSqMeters={walkState.areaClaimed}
          units={settings.units}
        />
      </View>

      {/* Stop Walk Control Button */}
      <View style={styles.footerContainer}>
        <TouchableOpacity
          style={styles.stopButton}
          activeOpacity={0.8}
          onPress={handleStopWalk}
          disabled={isStopping}
        >
          <Text style={styles.stopButtonText}>
            {isStopping ? 'STOPPING...' : 'STOP WALK'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Walk Complete Summary Modal */}
      <Modal
        visible={showSummaryModal}
        transparent={false}
        animationType="slide"
        onRequestClose={handleSaveSummary}
      >
        <SafeAreaView style={styles.summaryContainer}>
          <ScrollView contentContainerStyle={styles.summaryContent}>
            <Text style={styles.summaryHeaderTitle}>WALK COMPLETE</Text>

            {/* Primary Distance */}
            <Text style={styles.summaryDistanceText}>
              {formatDistance(savedSession?.distance || 0, settings.units)}
            </Text>

            {/* Metrics Breakdown */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryLabel}>DURATION</Text>
                <Text style={styles.summaryValue}>
                  {formatDuration(savedSession?.duration || 0)}
                </Text>
              </View>

              <View style={styles.summaryGridItem}>
                <Text style={styles.summaryLabel}>AVERAGE PACE</Text>
                <Text style={styles.summaryValue}>
                  {formatPace(savedSession?.averagePace || 0, settings.units)}
                </Text>
              </View>
            </View>

            {/* Area Claimed Badge */}
            {(savedSession?.areaClaimed || 0) > 0 && (
              <View style={styles.summaryAreaBadge}>
                <Text style={styles.summaryAreaValue}>
                  {formatArea(savedSession?.areaClaimed || 0)}
                </Text>
                <Text style={styles.summaryAreaLabel}>AREA CLAIMED</Text>
              </View>
            )}

            {/* Shared / Peer Encounters Summary */}
            <View style={styles.summaryPeerCard}>
              <View style={styles.peerSummaryRow}>
                <Text style={styles.peerSummaryLabel}>NEARBY USERS</Text>
                <Text style={styles.peerSummaryValue}>
                  {walkState.activePeer ? 1 : 0}
                </Text>
              </View>
              {walkState.sharedWalkDuration > 0 && (
                <View style={styles.peerSummaryRow}>
                  <Text style={styles.peerSummaryLabel}>WALKED TOGETHER</Text>
                  <Text style={styles.peerSummaryValue}>
                    {formatDuration(walkState.sharedWalkDuration)}
                  </Text>
                </View>
              )}
            </View>

            {/* Miniature Path Preview */}
            {savedSession?.points && savedSession.points.length > 0 && (
              <View style={styles.summaryPathPreview}>
                <PathRenderer
                  userPoints={savedSession.points}
                  width={Dimensions.get('window').width - 48}
                  height={180}
                  showGlow={true}
                  showEndpoint={false}
                  padding={20}
                />
              </View>
            )}

            {/* Save Action Button */}
            <TouchableOpacity
              style={styles.summarySaveButton}
              activeOpacity={0.8}
              onPress={handleSaveSummary}
            >
              <Text style={styles.summarySaveText}>SAVE</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
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
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  loopBadge: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderRadius: 10,
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
  statsContainer: {
    marginBottom: 12,
  },
  footerContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  stopButton: {
    backgroundColor: '#FF453A',
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF453A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  stopButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
  },

  // Summary Modal Styles
  summaryContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  summaryContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  summaryHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 4,
    marginBottom: 16,
  },
  summaryDistanceText: {
    fontSize: 52,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 24,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
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
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '500',
    color: '#E5E5EA',
  },
  summaryAreaBadge: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryAreaValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  summaryAreaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginTop: 4,
  },
  summaryPeerCard: {
    width: '100%',
    backgroundColor: '#0F0E14',
    borderWidth: 1,
    borderColor: Colors.peerPath,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  peerSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  peerSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.peerPath,
    letterSpacing: 1,
  },
  peerSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: 28,
  },
  summarySaveButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
  },
  summarySaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: 3,
  },
});
