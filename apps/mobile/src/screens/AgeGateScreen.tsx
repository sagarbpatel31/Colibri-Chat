import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';

export default function AgeGateScreen() {
  const { setAgeVerified } = useApp();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>18+</Text>
      <Text style={styles.title}>Age verification</Text>
      <Text style={styles.body}>
        Colibri Chat is for adults only. By continuing, you confirm that you are at least 18 years
        old and agree to our community guidelines.
      </Text>
      <Text style={styles.body}>
        We prioritize safety: messages are ephemeral, personal info is filtered, and abusive
        behavior leads to automatic restrictions.
      </Text>

      <Pressable
        style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed]}
        onPress={() => setAgeVerified(true)}
      >
        <Text style={styles.confirmText}>I am 18 or older</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.denyButton, pressed && styles.pressed]}
        onPress={() =>
          Linking.openURL('https://www.google.com').catch(() => {})
        }
      >
        <Text style={styles.denyText}>I am under 18</Text>
      </Pressable>

      <Text style={styles.footer}>
        By tapping "I am 18 or older" you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  icon: {
    fontSize: 48,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    marginBottom: 12,
  },
  confirmButton: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  confirmText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  denyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  denyText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.8,
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 17,
  },
});
