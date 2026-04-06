import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { getNearbyRooms, joinRoom, NearbyRoom } from '../lib/rpc';
import { RootStackParamList } from '../types/navigation';

export type NearbyRoomsProps = NativeStackScreenProps<RootStackParamList, 'NearbyRooms'>;

const ERROR_COPY: Record<string, string> = {
  outside_geofence: 'You are outside the room boundary.',
  room_not_active: 'This event has not started yet.',
  invalid_accuracy: 'Location accuracy is too low to join.',
  room_not_found: 'That room is unavailable.',
  not_authenticated: 'Please try again.',
};

function formatEventTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 0) return 'Ended';
  if (diffMins < 60) return `Starts in ${diffMins}m`;
  const diffHrs = Math.round(diffMins / 60);
  if (diffHrs < 24) return `Starts in ${diffHrs}h`;
  return `Starts ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function NearbyRoomsScreen({ navigation }: NearbyRoomsProps) {
  const { ensureSession, refreshLocation, setCurrentRoom } = useApp();
  const [rooms, setRooms] = useState<NearbyRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      await ensureSession();
      const location = await refreshLocation();
      const { data, error } = await getNearbyRooms({
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
        limit: 20,
      });

      if (error) {
        setBanner('Unable to load rooms.');
        setRooms([]);
      } else {
        setRooms(data ?? []);
      }
    } catch {
      setBanner('Location is required to discover rooms.');
    } finally {
      setLoading(false);
    }
  }, [ensureSession, refreshLocation]);

  // Filter out expired events, sort active rooms first
  const sortedRooms = useMemo(() => {
    const now = new Date();
    return rooms
      .filter((room) => {
        // Hide event rooms whose end time has passed
        if (room.room_type === 'event' && room.ends_at && new Date(room.ends_at) < now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.distance_m - b.distance_m;
      });
  }, [rooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Nearby',
      headerRight: () => (
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate('CreateRoom')}>
            <Text style={styles.headerCreate}>+ New</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerLink}>Settings</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation]);

  const handleJoin = async (room: NearbyRoom) => {
    if (!room.is_active) {
      setBanner('This event has not started yet.');
      return;
    }

    setBanner(null);
    setJoiningId(room.id);
    try {
      await ensureSession();
      const location = await refreshLocation();
      const { data, error } = await joinRoom({
        roomId: room.id,
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
      });

      if (error) {
        console.error('[JoinRoom] error:', JSON.stringify(error));
        setBanner(ERROR_COPY[error.code] ?? `Join failed: ${error.message}`);
        return;
      }

      if (data) {
        setCurrentRoom({ roomId: data.room_id, alias: data.alias });
        navigation.navigate('ChatRoom', { roomId: data.room_id, roomName: room.name });
      }
    } catch {
      setBanner('Location is required to join this room.');
    } finally {
      setJoiningId(null);
    }
  };

  const renderRoom = ({ item }: { item: NearbyRoom }) => {
    const distance = Math.round(item.distance_m);
    const inactive = !item.is_active;
    return (
      <Pressable
        style={[styles.roomCard, inactive && styles.roomCardInactive]}
        onPress={() => handleJoin(item)}
      >
        <View style={styles.roomHeader}>
          <View style={styles.roomTitleRow}>
            <Text style={[styles.roomName, inactive && styles.textMuted]}>{item.name}</Text>
            <View style={[styles.typeBadge, item.room_type === 'event' ? styles.badgeEvent : styles.badgeNeighborhood]}>
              <Text style={styles.typeBadgeText}>
                {item.room_type === 'event' ? 'Event' : 'Neighborhood'}
              </Text>
            </View>
          </View>
          <Text style={styles.roomDistance}>{distance}m</Text>
        </View>

        <View style={styles.roomFooter}>
          {item.member_count > 0 ? (
            <Text style={styles.memberCount}>{item.member_count} here</Text>
          ) : (
            <Text style={styles.memberCountEmpty}>No one here yet</Text>
          )}

          {inactive && item.starts_at ? (
            <Text style={styles.eventTime}>{formatEventTime(item.starts_at)}</Text>
          ) : null}
        </View>

        {joiningId === item.id ? <ActivityIndicator style={styles.joining} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      {loading && rooms.length === 0 ? <ActivityIndicator style={styles.loader} /> : null}
      <FlatList
        data={sortedRooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadRooms}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No rooms nearby</Text>
              <Text style={styles.emptyBody}>Tap "+ New" to create one at your location.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  banner: {
    backgroundColor: '#fdecea',
    color: '#8a2c2c',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    fontSize: 14,
  },
  loader: {
    marginTop: 40,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  roomCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  roomCardInactive: {
    opacity: 0.55,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  roomTitleRow: {
    flex: 1,
    marginRight: 12,
  },
  roomName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  textMuted: {
    color: '#6b7280',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeNeighborhood: {
    backgroundColor: '#e0f2fe',
  },
  badgeEvent: {
    backgroundColor: '#fef3c7',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  roomDistance: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 13,
    color: '#1d8f5f',
    fontWeight: '500',
  },
  memberCountEmpty: {
    fontSize: 13,
    color: '#9ca3af',
  },
  eventTime: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  joining: {
    marginTop: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 14,
    color: '#9ca3af',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerCreate: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 15,
  },
  headerLink: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
