import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { requestLocationPermission, getPermissionStatus } from '../lib/location';
import { useApp } from '../context/AppContext';

export default function LocationPermissionScreen() {
  const { setLocationPermission, refreshLocation } = useApp();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    const status = await getPermissionStatus();
    if (status === 'granted') {
      setLocationPermission(true);
      await refreshLocation();
    }
  }, [refreshLocation, setLocationPermission]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleRequest = async () => {
    const status = await requestLocationPermission();
    if (status === 'granted') {
      setLocationPermission(true);
      await refreshLocation();
    } else {
      setStatusMessage('Location is required to discover nearby rooms.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enable location</Text>
      <Text style={styles.body}>
        Colibri Chat only works when we can confirm you are nearby. We use your location to
        discover rooms and verify you are inside the geofence.
      </Text>
      {statusMessage ? <Text style={styles.error}>{statusMessage}</Text> : null}
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={handleRequest}
      >
        <Text style={styles.buttonText}>Allow location</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    color: '#333',
  },
  error: {
    color: '#c0392b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
