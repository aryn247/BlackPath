import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';
import { WalkSession } from '../../types';
import { deleteSession, getSessionById } from '../../services/database/db';
import { formatArea, formatDistance, formatDuration, formatPace } from '../../geo/distance';
import { useSettingsStore } from '../../store/settingsStore';
import { PathRenderer } from '../../components/PathRenderer';
import { Ionicons } from '@expo/vector-icons';

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const settings = useSettingsStore();

  const [session, setSession] = useState<WalkSession | null>(null);
  const [loading, setLoading] = useState(true);

  const canvasWidth = Dimensions.get('window').width - 40;
  const canvasHeight = Dimensions.get('window').height * 0.45;

  useEffect(() => {
    if (id) {
      loadSessionData(id);
    }
  }, [id]);

  const loadSessionData = async (sessionId: string) => {
    setLoading(true);
    try {
      const data = await getSessionById(sessionId);
      setSession(data);
    } catch (e) {
      console.warn('Error loading session detail:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!session) return;
    Alert.alert('DELETE WALK', 'Are you sure you want to delete this session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSession(session.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>LOADING PATH...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text style={styles.loadingText}>SESSION NOT FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  const formattedDate = new Date(session.startedAt).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>WALK DETAIL</Text>

        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color="#FF453A" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateText}>{formattedDate}</Text>

        {/* Abstract Glowing Path Canvas */}
        <View style={styles.canvasWrapper}>
          <PathRenderer
            userPoints={session.points || []}
            width={canvasWidth}
            height={canvasHeight}
            showGlow={true}
            showEndpoint={false}
            padding={30}
          />
        </View>

        {/* Distance Display */}
        <Text style={styles.distanceValue}>
          {formatDistance(session.distance, settings.units)}
        </Text>

        {/* Grid Stats */}
        <View style={styles.grid}>
          <View style={styles.gridBox}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>{formatDuration(session.duration)}</Text>
          </View>

          <View style={styles.gridBox}>
            <Text style={styles.statLabel}>AVERAGE PACE</Text>
            <Text style={styles.statValue}>
              {formatPace(session.averagePace, settings.units)}
            </Text>
          </View>
        </View>

        {/* Area Claimed Badge */}
        {session.areaClaimed > 0 && (
          <View style={styles.areaBadge}>
            <Text style={styles.areaValue}>{formatArea(session.areaClaimed)}</Text>
            <Text style={styles.areaLabel}>AREA CLAIMED</Text>
          </View>
        )}

        {/* Extra Metadata */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>GPS POINTS RECORDED</Text>
            <Text style={styles.metaValue}>{session.pathLength || session.points?.length || 0}</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 16,
  },
  canvasWrapper: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    overflow: 'hidden',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceValue: {
    fontSize: 48,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 20,
    textShadowColor: 'rgba(255, 255, 255, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  grid: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    paddingVertical: 16,
    marginBottom: 16,
  },
  gridBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#E5E5EA',
  },
  areaBadge: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  areaValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  areaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 2,
    marginTop: 4,
  },
  metaCard: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    padding: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
