import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Colors } from '../constants/theme';
import { formatDuration } from '../geo/distance';

interface SharedWalkViewProps {
  sharedDurationSeconds: number;
  estimatedDistanceMeters?: number;
  onLeaveWalk: () => void;
}

export const SharedWalkView: React.FC<SharedWalkViewProps> = ({
  sharedDurationSeconds,
  estimatedDistanceMeters = 24,
  onLeaveWalk,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleConfirmLeave = () => {
    setShowConfirmModal(false);
    onLeaveWalk();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>WALKING TOGETHER</Text>

      {/* Connection Indicator */}
      <View style={styles.peerRow}>
        <View style={styles.userLabelBox}>
          <Text style={styles.userLabel}>YOU</Text>
          <View style={styles.userDot} />
        </View>

        <View style={styles.connectionLineContainer}>
          <View style={styles.connectionLine} />
          <Text style={styles.proximityText}>{Math.round(estimatedDistanceMeters)} m</Text>
        </View>

        <View style={styles.userLabelBox}>
          <Text style={styles.userLabel}>THEM</Text>
          <View style={styles.peerDot} />
        </View>
      </View>

      {/* Live Together Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatDuration(sharedDurationSeconds)}</Text>
        <Text style={styles.timerSubLabel}>TOGETHER</Text>
      </View>

      {/* Leave Walk Button */}
      <TouchableOpacity
        style={styles.leaveButton}
        activeOpacity={0.7}
        onPress={() => setShowConfirmModal(true)}
      >
        <Text style={styles.leaveButtonText}>LEAVE WALK</Text>
      </TouchableOpacity>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>END SHARED WALK?</Text>
            <Text style={styles.modalBody}>
              You will stop walking together, but your own walk will continue.
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                activeOpacity={0.7}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLeaveButton}
                activeOpacity={0.7}
                onPress={handleConfirmLeave}
              >
                <Text style={styles.confirmLeaveText}>LEAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0E14',
    borderWidth: 1,
    borderColor: Colors.peerPath,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.peerPath,
    letterSpacing: 2,
    marginBottom: 16,
  },
  peerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  userLabelBox: {
    alignItems: 'center',
  },
  userLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.userPath,
    shadowColor: Colors.userPath,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  peerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.peerPath,
    shadowColor: Colors.peerPath,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  connectionLineContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  connectionLine: {
    width: '100%',
    height: 2,
    backgroundColor: Colors.peerPath,
    marginBottom: 4,
  },
  proximityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E5E5EA',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  timerText: {
    fontSize: 26,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  timerSubLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.peerPath,
    letterSpacing: 2,
    marginTop: 2,
  },
  leaveButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  leaveButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 1.5,
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
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  confirmLeaveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FF453A',
    alignItems: 'center',
  },
  confirmLeaveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
