import React, { useCallback, useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { requestLocationPermission, getPermissionStatus } from '../lib/location';
import { useApp } from '../context/AppContext';
import { RootStackParamList } from '../types/navigation';

export type LocationPermissionProps = NativeStackScreenProps<
  RootStackParamList,
  'LocationPermission'
>;

export default function LocationPermissionScreen({ navigation }: LocationPermissionProps) {
  const { setLocationPermission, refreshLocation } = useApp();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    const status = await getPermissionStatus();
    if (status === 'granted') {
      setLocationPermission(true);
      await refreshLocation();
      navigation.replace('NearbyRooms');
    } else {
      setLocationPermission(false);
    }
  }, [navigation, refreshLocation, setLocationPermission]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleRequest = async () => {
    const status = await requestLocationPermission();
    if (status === 'granted') {
      setLocationPermission(true);
      await refreshLocation();
      navigation.replace('NearbyRooms');
    } else {
      setLocationPermission(false);
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
      <Button title="Allow location" onPress={handleRequest} />
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
});
