import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { startHeartbeatLoop } from '../lib/presence';
import { sendMessage } from '../lib/rpc';
import { supabase } from '../lib/supabase';
import { RootStackParamList } from '../types/navigation';

export type ChatRoomProps = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

type Message = {
  id: string;
  room_id: string;
  user_id: string;
  alias: string;
  text: string;
  created_at: string;
  expires_at: string;
  status: string;
};

type PresenceMap = Record<string, boolean>;

const SEND_ERROR_COPY: Record<string, string> = {
  low_accuracy: 'Accuracy too low to post. Move to an open area.',
  outside_geofence: 'You are outside the room boundary.',
  rate_limited: 'Slow down. You can post once every 5 seconds.',
  pii_blocked: 'That message looks like personal info.',
  content_blocked: 'That message violates content rules.',
  room_not_active: 'This room is not active right now.',
  shadow_muted: 'Your messages are temporarily restricted.',
  message_too_long: 'Message must be 200 characters or less.',
  empty_message: 'Message cannot be empty.',
  not_a_member: 'You are no longer a member of this room.',
};

export default function ChatRoomScreen({ navigation, route }: ChatRoomProps) {
  const { roomId, roomName } = route.params;
  const { currentRoom, ensureSession, refreshLocation, session, isMessageHidden } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [postingDisabledReason, setPostingDisabledReason] = useState<
    'low_accuracy' | 'outside_geofence' | 'not_present' | null
  >(null);
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: roomName,
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.headerLink}>Settings</Text>
        </Pressable>
      ),
    });
  }, [navigation, roomName]);

  const handleBanner = useCallback((message: string, sticky = false) => {
    setBanner(message);
    if (!sticky) {
      setTimeout(() => setBanner(null), 4000);
    }
  }, []);

  const upsertMessages = useCallback((incoming: Message[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((msg) => [msg.id, msg]));
      for (const message of incoming) {
        byId.set(message.id, message);
      }
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      await ensureSession();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        handleBanner('Unable to load messages.');
        setMessages([]);
      } else {
        const sorted = (data ?? []).slice().sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sorted as Message[]);
      }
    } finally {
      setLoading(false);
    }
  }, [ensureSession, handleBanner, roomId]);

  const loadPresence = useCallback(async () => {
    const { data } = await supabase
      .from('room_members')
      .select('user_id,is_present')
      .eq('room_id', roomId);

    if (!data) return;
    setPresenceMap((prev) => {
      const next = { ...prev };
      data.forEach((member) => {
        next[member.user_id] = member.is_present;
      });
      return next;
    });
  }, [roomId]);

  useEffect(() => {
    loadMessages();
    loadPresence();
  }, [loadMessages, loadPresence]);

  useEffect(() => {
    const messageChannel = supabase
      .channel(`room:${roomId}:messages`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const record = payload.new as Message;
          if (!record?.expires_at) return;
          if (new Date(record.expires_at).getTime() <= Date.now()) return;
          upsertMessages([record]);
        }
      )
      .subscribe();

    const memberChannel = supabase
      .channel(`room:${roomId}:members`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const record = (payload.new ?? payload.old) as { user_id: string; is_present: boolean };
          if (!record?.user_id) return;
          setPresenceMap((prev) => ({ ...prev, [record.user_id]: record.is_present }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [roomId, upsertMessages]);

  useEffect(() => {
    if (!roomId) return undefined;
    const stop = startHeartbeatLoop({
      roomId,
      intervalMs: 25000,
      onHeartbeat: (result, location) => {
        if (result.is_present) {
          setPostingDisabledReason(null);
          return;
        }

        if (location.accuracyM > 25) {
          setPostingDisabledReason('low_accuracy');
        } else {
          setPostingDisabledReason('outside_geofence');
        }
      },
      onError: () => {
        handleBanner('Heartbeat failed. Trying again.');
      },
    });

    return stop;
  }, [handleBanner, roomId]);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !isMessageHidden(roomId, message.id)),
    [messages, isMessageHidden, roomId]
  );

  const handleSend = async () => {
    if (!composer.trim()) {
      handleBanner(SEND_ERROR_COPY.empty_message);
      return;
    }

    if (composer.length > 200) {
      handleBanner(SEND_ERROR_COPY.message_too_long);
      return;
    }

    if (postingDisabledReason) {
      return;
    }

    try {
      await ensureSession();
      const location = await refreshLocation();
      const { data, error } = await sendMessage({
        roomId,
        text: composer.trim(),
        lat: location.lat,
        lng: location.lng,
        accuracyM: location.accuracyM,
      });

      if (error) {
        if (error.code === 'low_accuracy' || error.code === 'outside_geofence') {
          setPostingDisabledReason(error.code);
          handleBanner(SEND_ERROR_COPY[error.code], true);
          return;
        }

        handleBanner(SEND_ERROR_COPY[error.code] ?? 'Unable to send message.');
        return;
      }

      if (data && session?.user) {
        const optimistic: Message = {
          id: data.message_id,
          room_id: roomId,
          user_id: session.user.id,
          alias: currentRoom?.alias ?? 'You',
          text: composer.trim(),
          created_at: data.created_at,
          expires_at: data.expires_at,
          status: 'active',
        };
        upsertMessages([optimistic]);
      }

      setComposer('');
    } catch (error) {
      handleBanner('Unable to send message.');
    }
  };

  const handleReport = (message: Message) => {
    navigation.navigate('ReportModal', {
      roomId,
      messageId: message.id,
      messageText: message.text,
      senderAlias: message.alias,
    });
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isPresent = presenceMap[item.user_id] ?? true;
    const mutedStyle = !isPresent ? styles.messageMuted : null;
    return (
      <Pressable onLongPress={() => handleReport(item)} style={styles.messageRow}>
        <Text style={[styles.messageAlias, mutedStyle]}>{item.alias}</Text>
        <Text style={[styles.messageText, mutedStyle]}>{item.text}</Text>
      </Pressable>
    );
  };

  const composerDisabled = postingDisabledReason !== null;
  const bannerCopy = postingDisabledReason
    ? postingDisabledReason === 'low_accuracy'
      ? SEND_ERROR_COPY.low_accuracy
      : postingDisabledReason === 'outside_geofence'
        ? SEND_ERROR_COPY.outside_geofence
        : 'You are not marked present in this room.'
    : banner;

  return (
    <View style={styles.container}>
      {bannerCopy ? <Text style={styles.banner}>{bannerCopy}</Text> : null}
      {loading ? <ActivityIndicator /> : null}
      <FlatList
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messages}
      />
      <View style={styles.composer}>
        <TextInput
          style={[styles.input, composerDisabled ? styles.inputDisabled : null]}
          value={composer}
          onChangeText={setComposer}
          placeholder={composerDisabled ? 'Posting disabled' : 'Write a message'}
          editable={!composerDisabled}
          maxLength={200}
          multiline
        />
        <View style={styles.composerFooter}>
          <Text style={styles.count}>{composer.length}/200</Text>
          <Pressable
            onPress={handleSend}
            style={({ pressed }) => [
              styles.sendButton,
              composerDisabled || !composer.trim() ? styles.sendDisabled : null,
              pressed && !composerDisabled ? styles.sendPressed : null,
            ]}
            disabled={composerDisabled || !composer.trim()}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  banner: {
    backgroundColor: '#fff1e5',
    color: '#7a3d12',
    padding: 10,
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
  },
  messages: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageRow: {
    marginBottom: 12,
  },
  messageAlias: {
    fontWeight: '600',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  messageMuted: {
    color: '#9ca3af',
  },
  composer: {
    borderTopWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  input: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  composerFooter: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  count: {
    fontSize: 12,
    color: '#666',
  },
  sendButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  sendDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendPressed: {
    opacity: 0.8,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
  headerLink: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
