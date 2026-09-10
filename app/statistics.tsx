import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { StatsSummary } from '../types';
import { getStatsSummary } from '../services/database/db';
import { formatArea, formatDistance, formatDuration } from '../geo/distance';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function StatisticsScreen() {
  const router = useRouter();
  const settings = useSettingsStore();

  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats(period);
  }, [period]);

  const loadStats = async (p: PeriodFilter) => {
    setLoading(true);
    try {
      const summary = await getStatsSummary(p);
      setStats(summary);
    } catch (e) {
      console.warn('Error loading stats:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STATISTICS</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Period Filter Segment Control */}
      <View style={styles.filterContainer}>
        {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.filterPill, period === p && styles.filterPillActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
              {p === 'today' ? 'TODAY' : p === 'week' ? 'WEEK' : p === 'month' ? 'MONTH' : 'ALL TIME'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Primary Stat Card - Total Distance */}
        <View style={styles.primaryCard}>
          <Text style={styles.cardLabel}>TOTAL DISTANCE</Text>
          <Text style={styles.primaryValue}>
            {formatDistance(stats?.totalDistance || 0, settings.units)}
          </Text>
        </View>

        {/* Secondary Stat Card - Total Area Claimed */}
        <View style={styles.primaryCard}>
          <Text style={styles.cardLabel}>TOTAL AREA CLAIMED</Text>
          <Text style={styles.primaryValue}>
            {formatArea(stats?.totalAreaClaimed || 0)}
          </Text>
        </View>

        {/* 2x2 Grid Stats */}
        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>TOTAL PATHS</Text>
            <Text style={styles.gridValue}>{stats?.totalPaths || 0}</Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>CURRENT STREAK</Text>
            <Text style={styles.gridValue}>
              {stats?.currentStreak || 0} {stats?.currentStreak === 1 ? 'DAY' : 'DAYS'}
            </Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>LONGEST PATH</Text>
            <Text style={styles.gridValue}>
              {formatDistance(stats?.longestPath || 0, settings.units)}
            </Text>
          </View>

          <View style={styles.gridCard}>
            <Text style={styles.cardLabel}>BIGGEST AREA</Text>
            <Text style={styles.gridValue}>
              {formatArea(stats?.biggestArea || 0)}
            </Text>
          </View>
        </View>

        {/* Social & Peer Encounter Stats */}
        <Text style={styles.sectionHeader}>BLE NEARBY ENCOUNTERS</Text>

        <View style={styles.socialCard}>
          <View style={styles.socialRow}>
            <Text style={styles.socialLabel}>NEARBY USERS ENCOUNTERED</Text>
            <Text style={styles.socialValue}>{stats?.nearbyEncounters || 0}</Text>
          </View>

          <View style={styles.socialDivider} />

          <View style={styles.socialRow}>
            <Text style={styles.socialLabel}>WALKS TOGETHER</Text>
            <Text style={styles.socialValue}>{stats?.walksTogetherCount || 0}</Text>
          </View>

          <View style={styles.socialDivider} />

          <View style={styles.socialRow}>
            <Text style={styles.socialLabel}>TIME WALKING TOGETHER</Text>
            <Text style={styles.socialValue}>
              {formatDuration(stats?.totalTimeTogether || 0)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#121214',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1,
  },
  filterTextActive: {
    color: '#000000',
  },
  scrollContent: {
    padding: 20,
  },
  primaryCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  primaryValue: {
    fontSize: 34,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  gridCard: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 16,
    alignItems: 'center',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E5E5EA',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginTop: 12,
    marginBottom: 12,
  },
  socialCard: {
    backgroundColor: '#0F0E14',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.peerPath,
    padding: 18,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  socialLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.peerPath,
    letterSpacing: 1,
  },
  socialValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  socialDivider: {
    height: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
});
