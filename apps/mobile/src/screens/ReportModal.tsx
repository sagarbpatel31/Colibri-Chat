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

const REASONS = [
  { key: 'Spam', label: 'Spam', description: 'Unsolicited or repetitive messages' },
  { key: 'Harassment', label: 'Harassment', description: 'Bullying, threats, or intimidation' },
  { key: 'PII', label: 'Personal info', description: 'Sharing phone numbers, emails, addresses' },
  { key: 'Inappropriate', label: 'Inappropriate', description: 'Sexual, violent, or hateful content' },
  { key: 'Other', label: 'Other', description: 'Something else' },
];

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
      setError('Please describe the issue.');
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

  const truncatedText =
    messageText.length > 80 ? messageText.slice(0, 80) + '...' : messageText;

  return (
    <View style={styles.container}>
      {/* Message preview */}
      <View style={styles.messagePreview}>
        <Text style={styles.previewAlias}>{senderAlias}</Text>
        <Text style={styles.previewText}>{truncatedText}</Text>
      </View>

      <Text style={styles.sectionLabel}>Why are you reporting this?</Text>

      {/* Reason options */}
      <View style={styles.reasonList}>
        {REASONS.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => setSelectedReason(opt.key)}
            style={[styles.reasonRow, selectedReason === opt.key && styles.reasonRowActive]}
          >
            <View style={styles.radio}>
              {selectedReason === opt.key ? <View style={styles.radioInner} /> : null}
            </View>
            <View style={styles.reasonContent}>
              <Text style={[styles.reasonLabel, selectedReason === opt.key && styles.reasonLabelActive]}>
                {opt.label}
              </Text>
              <Text style={styles.reasonDescription}>{opt.description}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      {selectedReason === 'Other' ? (
        <TextInput
          style={styles.input}
          value={customReason}
          onChangeText={setCustomReason}
          placeholder="Describe the issue..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={200}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actions}>
        <Pressable
          onPress={handleSubmit}
          style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit report</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  messagePreview: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  previewAlias: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  previewText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  reasonList: {
    marginBottom: 12,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  reasonRowActive: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
  },
  reasonLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  reasonDescription: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    marginBottom: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  error: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  actions: {
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
});
