import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { StatsSummary } from '../types';
import { getStatsSummary } from '../services/database/db';
import { formatArea, formatDistance, formatDuration } from '../geo/distance';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';

import { BottomNav } from '../components/BottomNav';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function StatisticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadStats(period);
    }, [period])
  );

  const loadStats = async (p: PeriodFilter) => {
    try {
      const summary = await getStatsSummary(p);
      setStats(summary);
    } catch (e) {
      console.warn('Error loading stats:', e);
    }
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 10;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.headerTitle}>Your Stats</Text>
      </View>

      {/* Time Horizon Selector (Mockup Screen 11) */}
      <View style={styles.filterPillsRow}>
        {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterPill, period === p && styles.filterPillActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterPillText, period === p && styles.filterPillTextActive]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'Week' : p === 'month' ? 'Month' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2x4 Metric Grid Cards (Mockup Screen 11) */}
        {/* Row 1 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Total Distance</Text>
            <Text style={styles.gridValue}>
              {formatDistance(stats?.totalDistance || 0, settings.units)}
            </Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Total Area Claimed</Text>
            <Text style={styles.gridValue}>
              {formatArea(stats?.totalAreaClaimed || 0)}
            </Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Total Paths</Text>
            <Text style={styles.gridValue}>{stats?.totalPaths || 0}</Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Nearby Users</Text>
            <Text style={styles.gridValue}>{stats?.nearbyEncounters || 0}</Text>
          </View>
        </View>

        {/* Row 3 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Walks Together</Text>
            <Text style={styles.gridValue}>{stats?.walksTogetherCount || 0}</Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Time Together</Text>
            <Text style={styles.gridValue}>
              {formatDuration(stats?.totalTimeTogether || 0)}
            </Text>
          </View>
        </View>

        {/* Row 4 */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Longest Path</Text>
            <Text style={styles.gridValue}>
              {formatDistance(stats?.longestPath || 0, settings.units)}
            </Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>Biggest Area</Text>
            <Text style={styles.gridValue}>
              {formatArea(stats?.biggestArea || 0)}
            </Text>
          </View>
        </View>

        {/* Current Streak Banner */}
        <View style={styles.streakCard}>
          <Text style={styles.cardLabel}>Current Streak</Text>
          <Text style={styles.streakValue}>
            {stats?.currentStreak || 0} {stats?.currentStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </ScrollView>

      {/* Persistent Bottom Nav Bar */}
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterPillsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  filterPillTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#0D0D0E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  gridValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakCard: {
    backgroundColor: '#0D0D0E',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  streakValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
