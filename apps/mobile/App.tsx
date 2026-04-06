import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider, useApp } from './src/context/AppContext';
import AgeGateScreen from './src/screens/AgeGateScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CreateRoomScreen from './src/screens/CreateRoomScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import NearbyRoomsScreen from './src/screens/NearbyRoomsScreen';
import ReportModal from './src/screens/ReportModal';
import SettingsScreen from './src/screens/SettingsScreen';
import { setupNotifications } from './src/lib/notifications';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const { ageVerified, locationPermission } = useApp();

  useEffect(() => {
    setupNotifications();
  }, []);

  // Still loading initial state
  if (ageVerified === null || locationPermission === null) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Step 1: Age gate
  if (!ageVerified) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="AgeGate" component={AgeGateScreen} />
      </Stack.Navigator>
    );
  }

  // Step 2: Location permission
  if (!locationPermission) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} />
      </Stack.Navigator>
    );
  }

  // Step 3: Main app
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="NearbyRooms"
        component={NearbyRoomsScreen}
        options={{ title: 'Nearby' }}
      />
      <Stack.Screen
        name="CreateRoom"
        component={CreateRoomScreen}
        options={{ title: 'Create room' }}
      />
      <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
      <Stack.Screen
        name="ReportModal"
        component={ReportModal}
        options={{ presentation: 'modal', title: 'Report message' }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Navigation />
      </NavigationContainer>
    </AppProvider>
  );
}
