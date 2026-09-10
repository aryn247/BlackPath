import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/theme';
import { WalkSession } from '../types';
import { deleteAllHistory, deleteSession, getAllSessions } from '../services/database/db';
import { formatArea, formatDistance, formatDuration, formatPace } from '../geo/distance';
import { useSettingsStore } from '../store/settingsStore';
import { PathRenderer } from '../components/PathRenderer';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
  const router = useRouter();
  const settings = useSettingsStore();
  const [sessions, setSessions] = useState<WalkSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getAllSessions();
      setSessions(data);
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setLoading(false);
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

  const handleDeleteAll = () => {
    Alert.alert(
      'DELETE ALL HISTORY',
      'This will permanently delete all saved walks from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllHistory();
            loadHistory();
          },
        },
      ]
    );
  };

  const renderSessionItem = ({ item }: { item: WalkSession }) => {
    const formattedDate = new Date(item.startedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => router.push(`/session/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>{formattedDate}</Text>
          <TouchableOpacity
            style={styles.deleteIconButton}
            onPress={() => handleDeleteSession(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Main Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatDistance(item.distance, settings.units)}
            </Text>
            <Text style={styles.metricLabel}>DISTANCE</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{formatDuration(item.duration)}</Text>
            <Text style={styles.metricLabel}>DURATION</Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>
              {formatPace(item.averagePace, settings.units)}
            </Text>
            <Text style={styles.metricLabel}>PACE</Text>
          </View>
        </View>

        {/* Area Claimed Badge if present */}
        {item.areaClaimed > 0 && (
          <View style={styles.areaBadge}>
            <Text style={styles.areaText}>{formatArea(item.areaClaimed)} CLAIMED</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>HISTORY</Text>

        {sessions.length > 0 ? (
          <TouchableOpacity onPress={handleDeleteAll}>
            <Text style={styles.clearAllText}>CLEAR</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* History List */}
      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>NO SAVED WALKS</Text>
          <Text style={styles.emptySubtitle}>Your completed walks will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSessionItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  clearAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF453A',
    letterSpacing: 1,
  },
  listContent: {
    padding: 20,
  },
  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1C1C1E',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
  },
  deleteIconButton: {
    padding: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  areaBadge: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  areaText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
  },
});
