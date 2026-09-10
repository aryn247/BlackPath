import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { NearbyUser } from '../types';

interface JoinRequestProps {
  peer: NearbyUser;
  onAccept: (peerId: string) => void;
  onDecline: (peerId: string) => void;
}

export const JoinRequest: React.FC<JoinRequestProps> = ({
  peer,
  onAccept,
  onDecline,
}) => {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>SOMEONE WOULD LIKE</Text>
      <Text style={styles.titleBold}>TO JOIN YOUR WALK</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.declineButton}
          activeOpacity={0.7}
          onPress={() => onDecline(peer.temporaryId)}
        >
          <Text style={styles.declineText}>DECLINE</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          activeOpacity={0.7}
          onPress={() => onAccept(peer.temporaryId)}
        >
          <Text style={styles.acceptText}>ACCEPT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#121018',
    borderWidth: 1,
    borderColor: Colors.peerPath,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: Colors.peerPath,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
  },
  titleBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.5,
    marginTop: 2,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  declineButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  declineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 1,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.peerPath,
    alignItems: 'center',
  },
  acceptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
