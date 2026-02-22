import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
    } catch (error) {
      setBanner('Location is required to discover rooms.');
    } finally {
      setLoading(false);
    }
  }, [ensureSession, refreshLocation]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.headerLink}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const handleJoin = async (room: NearbyRoom) => {
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
        setBanner(ERROR_COPY[error.code] ?? 'Unable to join room.');
        return;
      }

      if (data) {
        setCurrentRoom({ roomId: data.room_id, alias: data.alias });
        navigation.navigate('ChatRoom', { roomId: data.room_id, roomName: room.name });
      }
    } catch (error) {
      setBanner('Location is required to join this room.');
    } finally {
      setJoiningId(null);
    }
  };

  const renderRoom = ({ item }: { item: NearbyRoom }) => {
    const distance = Math.round(item.distance_m);
    const inactive = item.room_type === 'event' && !item.is_active;
    return (
      <Pressable style={styles.roomCard} onPress={() => handleJoin(item)}>
        <View style={styles.roomHeader}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.roomDistance}>{distance}m</Text>
        </View>
        <View style={styles.roomMetaRow}>
          <Text style={styles.roomMeta}>{item.room_type === 'event' ? 'Event' : 'Neighborhood'}</Text>
          <Text style={[styles.roomStatus, inactive ? styles.roomInactive : styles.roomActive]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {inactive && item.starts_at ? (
          <Text style={styles.roomStarts}>Starts {new Date(item.starts_at).toLocaleString()}</Text>
        ) : null}
        {joiningId === item.id ? <ActivityIndicator style={styles.joining} /> : null}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby rooms</Text>
      {banner ? <Text style={styles.banner}>{banner}</Text> : null}
      {loading && rooms.length === 0 ? <ActivityIndicator /> : null}
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderRoom}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadRooms}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No active rooms nearby.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  banner: {
    backgroundColor: '#fdecea',
    color: '#8a2c2c',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  roomCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f7f7f8',
    marginBottom: 12,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '600',
  },
  roomDistance: {
    fontSize: 14,
    color: '#555',
  },
  roomMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roomMeta: {
    fontSize: 14,
    color: '#444',
  },
  roomStatus: {
    fontSize: 13,
    fontWeight: '600',
  },
  roomActive: {
    color: '#1d8f5f',
  },
  roomInactive: {
    color: '#c0392b',
  },
  roomStarts: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
  },
  joining: {
    marginTop: 12,
  },
  empty: {
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
  },
  headerLink: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
