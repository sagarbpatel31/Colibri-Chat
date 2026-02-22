import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from './src/context/AppContext';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import LocationPermissionScreen from './src/screens/LocationPermissionScreen';
import NearbyRoomsScreen from './src/screens/NearbyRoomsScreen';
import ReportModal from './src/screens/ReportModal';
import SettingsScreen from './src/screens/SettingsScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="LocationPermission"
            component={LocationPermissionScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="NearbyRooms" component={NearbyRoomsScreen} />
          <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
          <Stack.Screen
            name="ReportModal"
            component={ReportModal}
            options={{ presentation: 'modal', title: 'Report message' }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
