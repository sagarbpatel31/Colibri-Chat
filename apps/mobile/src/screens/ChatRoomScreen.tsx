import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
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
import { sendLocalNotification } from '../lib/notifications';
import { useScreenProtection } from '../lib/screenProtection';
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

import { relativeTime } from '../lib/time';

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
  user_timed_out: 'You are temporarily restricted from posting due to violations.',
};

export default function ChatRoomScreen({ navigation, route }: ChatRoomProps) {
  const { roomId, roomName } = route.params;
  const { currentRoom, setCurrentRoom, ensureSession, refreshLocation, session, isMessageHidden } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [composer, setComposer] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [postingDisabledReason, setPostingDisabledReason] = useState<
    'low_accuracy' | 'outside_geofence' | 'not_present' | null
  >(null);
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});
  const flatListRef = useRef<FlatList<Message>>(null);

  useScreenProtection();

  // Clear room state when leaving
  useEffect(() => {
    return () => setCurrentRoom(null);
  }, [setCurrentRoom]);

  const presentCount = useMemo(
    () => Object.values(presenceMap).filter(Boolean).length,
    [presenceMap]
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: roomName,
      headerRight: () => (
        <View style={styles.headerRight}>
          {presentCount > 0 ? (
            <Text style={styles.headerPresence}>{presentCount} here</Text>
          ) : null}
          <Pressable onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.headerLink}>Settings</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, roomName, presentCount]);

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
      const { data, error } = await supabase.rpc('get_room_messages', {
        p_room_id: roomId,
        p_limit: 50,
      });

      if (error) {
        console.error('[LoadMessages] error:', JSON.stringify(error));
        handleBanner('Unable to load messages.');
        setMessages([]);
      } else {
        console.log('[LoadMessages] loaded', data?.length ?? 0, 'messages');
        const sorted = (data ?? []).slice().sort(
          (a: Message, b: Message) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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
          // Notify for messages from other users
          if (record.user_id !== session?.user?.id) {
            sendLocalNotification(record.alias, record.text);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Reload messages on reconnect after error
          loadMessages();
        }
      });

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
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          loadPresence();
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(memberChannel);
    };
  }, [roomId, upsertMessages, loadMessages, loadPresence]);

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

        if (location.accuracyM > 100) {
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

  // Sweep expired messages every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMessages((prev) => {
        const now = Date.now();
        const filtered = prev.filter((msg) => new Date(msg.expires_at).getTime() > now);
        return filtered.length === prev.length ? prev : filtered;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const visibleMessages = useMemo(
    () => messages.filter((message) => !isMessageHidden(roomId, message.id)),
    [messages, isMessageHidden, roomId]
  );

  // Auto-scroll to bottom when new messages arrive
  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (visibleMessages.length > prevMessageCount.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
    prevMessageCount.current = visibleMessages.length;
  });

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
        <View style={styles.messageHeader}>
          <Text style={[styles.messageAlias, mutedStyle]}>{item.alias}</Text>
          <Text style={[styles.messageTime, mutedStyle]}>{relativeTime(item.created_at)}</Text>
        </View>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {bannerCopy ? <Text style={styles.banner}>{bannerCopy}</Text> : null}
      {loading ? <ActivityIndicator /> : null}
      <FlatList
        ref={flatListRef}
        data={visibleMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messages,
          visibleMessages.length === 0 && !loading ? styles.emptyList : null,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptyBody}>Be the first to say something.</Text>
            </View>
          ) : null
        }
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
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
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
    </KeyboardAvoidingView>
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
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageAlias: {
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  messageText: {
    fontSize: 16,
  },
  messageMuted: {
    color: '#9ca3af',
  },
  messageList: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 14,
    color: '#9ca3af',
  },
  composer: {
    borderTopWidth: 1,
    borderColor: '#eee',
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  input: {
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ddd',
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerPresence: {
    fontSize: 13,
    color: '#1d8f5f',
    fontWeight: '500',
  },
  headerLink: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
