import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { WalkSession } from '../types';
import { deleteAllHistory, deleteSession, getAllSessions } from '../services/database/db';
import { formatArea, formatDistance, formatDuration, formatPace } from '../geo/distance';
import { useSettingsStore } from '../store/settingsStore';
import { Ionicons } from '@expo/vector-icons';

import { PathRenderer } from '../components/PathRenderer';
import { BottomNav } from '../components/BottomNav';

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();
  const [sessions, setSessions] = useState<WalkSession[]>([]);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Week' | 'Month' | 'Year'>('All');

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e) {
      console.warn('Failed to load history:', e);
    }
  };

  const handleDeleteSession = (id: string) => {
    Alert.alert('DELETE WALK', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(id);
          loadHistory();
        },
      },
    ]);
  };

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0) + 10;

  const filteredSessions = sessions.filter((s) => {
    if (activeFilter === 'All') return true;
    const now = Date.now();
    const diff = now - s.startedAt;
    if (activeFilter === 'Week') return diff <= 7 * 86400 * 1000;
    if (activeFilter === 'Month') return diff <= 30 * 86400 * 1000;
    if (activeFilter === 'Year') return diff <= 365 * 86400 * 1000;
    return true;
  });

  const renderSessionItem = ({ item }: { item: WalkSession }) => {
    const formattedDate = new Date(item.startedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/session/${item.id}`)}
      >
        {/* Left Side: Miniature Path Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {item.points && item.points.length > 0 ? (
            <PathRenderer
              userPoints={item.points}
              width={64}
              height={64}
              showGlow={false}
              showEndpoint={false}
              padding={6}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
        </View>

        {/* Right Side: Details */}
        <View style={styles.cardDetails}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardDate}>{formattedDate}</Text>
            <TouchableOpacity
              onPress={() => handleDeleteSession(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={16} color="#48484A" />
            </TouchableOpacity>
          </View>

          <View style={styles.metricsInlineRow}>
            <Text style={styles.primaryMetricText}>
              {formatDistance(item.distance, settings.units)}
            </Text>
            {item.areaClaimed > 0 && (
              <Text style={styles.areaMetricText}>
                {formatArea(item.areaClaimed)}
              </Text>
            )}
          </View>

          <View style={styles.secondaryInlineRow}>
            <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
            <Text style={styles.paceText}>{formatPace(item.averagePace, settings.units)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding }]}>
        <Text style={styles.headerTitle}>History</Text>
      </View>

      {/* Time Filter Pills (Mockup Screen 10) */}
      <View style={styles.filterPillsRow}>
        {(['All', 'Week', 'Month', 'Year'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterPillText, activeFilter === filter && styles.filterPillTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* History List */}
      {filteredSessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>NO SAVED WALKS</Text>
          <Text style={styles.emptySubtitle}>Your completed walks will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0E',
    borderWidth: 1,
    borderColor: '#1C1C1E',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailPlaceholder: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F0FF',
  },
  cardDetails: {
    flex: 1,
    marginLeft: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  metricsInlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  primaryMetricText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 10,
  },
  areaMetricText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  secondaryInlineRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
    marginRight: 12,
  },
  paceText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
