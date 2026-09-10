import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/theme';
import { NearbyUser } from '../types';

interface NearbyUserPromptProps {
  peer: NearbyUser;
  onJoin: (peerId: string) => void;
  onNotNow: (peerId: string) => void;
}

export const NearbyUserPrompt: React.FC<NearbyUserPromptProps> = ({
  peer,
  onJoin,
  onNotNow,
}) => {
  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <View style={styles.pulseDot} />
        <Text style={styles.title}>A BLACKPATH USER IS NEARBY</Text>
      </View>
      <Text style={styles.subtitle}>Would you like to join their walk?</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.notNowButton}
          activeOpacity={0.7}
          onPress={() => onNotNow(peer.temporaryId)}
        >
          <Text style={styles.notNowText}>NOT NOW</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.joinButton}
          activeOpacity={0.7}
          onPress={() => onJoin(peer.temporaryId)}
        >
          <Text style={styles.joinText}>JOIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0F0F12',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: Colors.peerPath,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.peerPath,
    marginRight: 8,
    shadowColor: Colors.peerPath,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.peerPath,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E5E5EA',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  notNowButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  notNowText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  joinButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.userPath,
    alignItems: 'center',
  },
  joinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
});
