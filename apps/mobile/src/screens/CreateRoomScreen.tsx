import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { createRoom } from '../lib/rpc';
import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateRoom'>;

const DURATION_OPTIONS = [
  { label: '1 hour', hours: 1 },
  { label: '2 hours', hours: 2 },
  { label: '4 hours', hours: 4 },
  { label: '8 hours', hours: 8 },
];

export default function CreateRoomScreen({ navigation }: Props) {
  const { ensureSession, refreshLocation } = useApp();
  const [name, setName] = useState('');
  const [roomType, setRoomType] = useState<'neighborhood' | 'event'>('neighborhood');
  const [durationHours, setDurationHours] = useState(2);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setBanner('Please enter a room name.');
      return;
    }
    if (trimmed.length > 60) {
      setBanner('Name must be 60 characters or less.');
      return;
    }

    setSubmitting(true);
    setBanner(null);

    try {
      await ensureSession();
      const location = await refreshLocation();

      const params: Parameters<typeof createRoom>[0] = {
        name: trimmed,
        roomType,
        lat: location.lat,
        lng: location.lng,
      };

      if (roomType === 'event') {
        const now = new Date();
        const end = new Date(now.getTime() + durationHours * 60 * 60 * 1000);
        params.startsAt = now.toISOString();
        params.endsAt = end.toISOString();
      }

      const { data, error } = await createRoom(params);

      if (error) {
        const messages: Record<string, string> = {
          empty_name: 'Please enter a room name.',
          name_too_long: 'Name must be 60 characters or less.',
          invalid_room_type: 'Invalid room type.',
          not_authenticated: 'Please try again.',
        };
        setBanner(messages[error.code] ?? 'Unable to create room.');
        return;
      }

      if (data) {
        navigation.replace('NearbyRooms');
      }
    } catch {
      setBanner('Location is required to create a room.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Room name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Coffee Shop Hangout"
          maxLength={60}
          autoFocus
        />
        <Text style={styles.charCount}>{name.length}/60</Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeButton, roomType === 'neighborhood' && styles.typeSelected]}
            onPress={() => setRoomType('neighborhood')}
          >
            <Text style={[styles.typeText, roomType === 'neighborhood' && styles.typeTextSelected]}>
              Neighborhood
            </Text>
            <Text style={styles.typeDescription}>Always active, 60 min messages</Text>
          </Pressable>
          <Pressable
            style={[styles.typeButton, roomType === 'event' && styles.typeSelected]}
            onPress={() => setRoomType('event')}
          >
            <Text style={[styles.typeText, roomType === 'event' && styles.typeTextSelected]}>
              Event
            </Text>
            <Text style={styles.typeDescription}>Time-limited, messages expire at end</Text>
          </Pressable>
        </View>

        {roomType === 'event' ? (
          <>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.hours}
                  style={[
                    styles.durationButton,
                    durationHours === opt.hours && styles.durationSelected,
                  ]}
                  onPress={() => setDurationHours(opt.hours)}
                >
                  <Text
                    style={[
                      styles.durationText,
                      durationHours === opt.hours && styles.durationTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.hint}>
          The room will be created at your current location with a 200m radius.
          {roomType === 'event'
            ? ` It will be active for ${durationHours} hour${durationHours > 1 ? 's' : ''} starting now.`
            : ' Neighborhood rooms are always active.'}
        </Text>

        {banner ? <Text style={styles.banner}>{banner}</Text> : null}

        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            submitting && styles.createDisabled,
            pressed && !submitting && styles.createPressed,
          ]}
          onPress={handleCreate}
          disabled={submitting}
        >
          <Text style={styles.createText}>{submitting ? 'Creating...' : 'Create room'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#f9fafb',
  },
  typeSelected: {
    borderColor: '#111827',
    backgroundColor: '#f0f0f5',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  typeTextSelected: {
    color: '#111827',
  },
  typeDescription: {
    fontSize: 12,
    color: '#9ca3af',
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  durationSelected: {
    borderColor: '#111827',
    backgroundColor: '#f0f0f5',
  },
  durationText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  durationTextSelected: {
    color: '#111827',
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 16,
    lineHeight: 18,
  },
  banner: {
    backgroundColor: '#fdecea',
    color: '#8a2c2c',
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  createButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  createDisabled: {
    backgroundColor: '#9ca3af',
  },
  createPressed: {
    opacity: 0.8,
  },
  createText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
