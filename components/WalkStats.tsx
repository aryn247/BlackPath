import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';
import { formatArea, formatDistance, formatDuration, formatPace } from '../geo/distance';
import { UnitSystem } from '../types';

interface WalkStatsProps {
  distanceMeters: number;
  durationSeconds: number;
  paceSeconds: number;
  areaClaimedSqMeters?: number;
  units?: UnitSystem;
  compact?: boolean;
}

export const WalkStats: React.FC<WalkStatsProps> = ({
  distanceMeters,
  durationSeconds,
  paceSeconds,
  areaClaimedSqMeters = 0,
  units = 'km',
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Primary Distance Display */}
      <View style={styles.primaryMetricRow}>
        <Text style={styles.distanceText}>{formatDistance(distanceMeters, units)}</Text>
      </View>

      {/* Secondary Metrics Row */}
      <View style={styles.secondaryMetricsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>DURATION</Text>
          <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PACE</Text>
          <Text style={styles.statValue}>{formatPace(paceSeconds, units)}</Text>
        </View>
      </View>

      {/* Loop Area Claimed Badge (if loop is closed & area detected) */}
      {areaClaimedSqMeters > 0 && (
        <View style={styles.areaBadge}>
          <Text style={styles.areaBadgeValue}>{formatArea(areaClaimedSqMeters)}</Text>
          <Text style={styles.areaBadgeLabel}>AREA CLAIMED</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    marginHorizontal: 20,
  },
  containerCompact: {
    paddingVertical: 10,
    marginHorizontal: 0,
  },
  primaryMetricRow: {
    marginBottom: 8,
  },
  distanceText: {
    fontSize: 44,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  secondaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#2C2C2E',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#E5E5EA',
  },
  areaBadge: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
  },
  areaBadgeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  areaBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginTop: 2,
  },
});
