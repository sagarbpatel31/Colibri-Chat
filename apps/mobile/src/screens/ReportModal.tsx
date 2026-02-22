import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { reportMessage } from '../lib/rpc';
import { RootStackParamList } from '../types/navigation';

export type ReportModalProps = NativeStackScreenProps<RootStackParamList, 'ReportModal'>;

const REASONS = ['Spam', 'Harassment', 'PII', 'Other'];

export default function ReportModal({ navigation, route }: ReportModalProps) {
  const { roomId, messageId, messageText, senderAlias } = route.params;
  const { hideMessage } = useApp();
  const [selectedReason, setSelectedReason] = useState<string>('Spam');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = useMemo(() => {
    if (selectedReason === 'Other') {
      return customReason.trim();
    }
    return selectedReason;
  }, [customReason, selectedReason]);

  const handleSubmit = async () => {
    if (!reason) {
      setError('Please add a reason.');
      return;
    }

    setLoading(true);
    setError(null);
    hideMessage(roomId, messageId);

    const { error: reportError } = await reportMessage({
      roomId,
      messageId,
      reason,
    });

    setLoading(false);

    if (reportError) {
      setError('Unable to submit report.');
      return;
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Report message</Text>
      <Text style={styles.subtitle}>
        From {senderAlias}: \"{messageText}\"
      </Text>
      <View style={styles.reasonList}>
        {REASONS.map((reasonOption) => (
          <Pressable
            key={reasonOption}
            onPress={() => setSelectedReason(reasonOption)}
            style={[
              styles.reasonChip,
              selectedReason === reasonOption ? styles.reasonChipActive : null,
            ]}
          >
            <Text
              style={
                selectedReason === reasonOption ? styles.reasonTextActive : styles.reasonText
              }
            >
              {reasonOption}
            </Text>
          </Pressable>
        ))}
      </View>
      {selectedReason === 'Other' ? (
        <TextInput
          style={styles.input}
          value={customReason}
          onChangeText={setCustomReason}
          placeholder="Describe the issue"
          multiline
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [styles.submit, pressed ? styles.submitPressed : null]}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
      </Pressable>
      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.cancel}>Cancel</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 16,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  reasonChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  reasonText: {
    color: '#222',
  },
  reasonTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    minHeight: 80,
    marginBottom: 12,
  },
  error: {
    color: '#c0392b',
    marginBottom: 12,
  },
  submit: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitPressed: {
    opacity: 0.85,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancel: {
    textAlign: 'center',
    color: '#1d4ed8',
    fontWeight: '500',
  },
});
