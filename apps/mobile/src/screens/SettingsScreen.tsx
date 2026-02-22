import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

const TERMS_URL = 'https://colibri.chat/terms';
const SAFETY_URL = 'https://colibri.chat/safety';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>18+ acknowledgement</Text>
        <Text style={styles.cardBody}>By using Colibri Chat you confirm you are 18 or older.</Text>
      </View>
      <Pressable style={styles.linkRow} onPress={() => Linking.openURL(TERMS_URL)}>
        <Text style={styles.linkText}>Terms of Service</Text>
      </Pressable>
      <Pressable style={styles.linkRow} onPress={() => Linking.openURL(SAFETY_URL)}>
        <Text style={styles.linkText}>Safety & Community Guidelines</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f7f7f8',
    marginBottom: 20,
  },
  cardTitle: {
    fontWeight: '600',
    marginBottom: 6,
  },
  cardBody: {
    color: '#444',
  },
  linkRow: {
    paddingVertical: 12,
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '500',
  },
});
