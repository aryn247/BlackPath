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
}) => {
  return (
    <View style={styles.topGridContainer}>
      <View style={styles.gridRow}>
        {/* Top Left: Duration */}
        <View style={styles.metricCellLeft}>
          <Text style={styles.metricValueLarge}>{formatDuration(durationSeconds)}</Text>
          <Text style={styles.metricLabel}>DURATION</Text>
        </View>

        {/* Top Right: Distance */}
        <View style={styles.metricCellRight}>
          <Text style={styles.metricValueLarge}>{formatDistance(distanceMeters, units)}</Text>
          <Text style={styles.metricLabel}>DISTANCE</Text>
        </View>
      </View>

      <View style={[styles.gridRow, { marginTop: 12 }]}>
        {/* Bottom Left: Pace */}
        <View style={styles.metricCellLeft}>
          <Text style={styles.metricValueSmall}>{formatPace(paceSeconds, units)}</Text>
          <Text style={styles.metricLabel}>PACE</Text>
        </View>

        {/* Bottom Right: Area */}
        <View style={styles.metricCellRight}>
          <Text style={styles.metricValueSmall}>
            {areaClaimedSqMeters > 0 ? formatArea(areaClaimedSqMeters) : '--'}
          </Text>
          <Text style={styles.metricLabel}>AREA</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topGridContainer: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    width: '100%',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metricCellLeft: {
    alignItems: 'flex-start',
  },
  metricCellRight: {
    alignItems: 'flex-end',
  },
  metricValueLarge: {
    fontSize: 22,
    fontWeight: '400',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  metricValueSmall: {
    fontSize: 18,
    fontWeight: '400',
    color: '#E5E5EA',
    letterSpacing: 0.5,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 2,
  },
});
