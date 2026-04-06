import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Local notifications for new messages when app is foregrounded but user is on a different screen.
 * Push notifications require a dev build (not Expo Go) and server-side token management.
 * This module uses local notifications as a lightweight alternative.
 */

let Notifications: typeof import('expo-notifications') | null = null;

try {
  Notifications = require('expo-notifications');
} catch {
  // Not available in this environment
}

export async function setupNotifications() {
  if (!Notifications) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Notifications not supported
  }
}

export async function sendLocalNotification(title: string, body: string) {
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: null, // immediate
    });
  } catch {
    // ignore
  }
}

/**
 * Hook to track whether the user is currently viewing a specific room.
 * Used to suppress notifications for the room they're already in.
 */
export function useActiveRoom() {
  const activeRoomRef = useRef<string | null>(null);
  return {
    setActiveRoom: (roomId: string | null) => {
      activeRoomRef.current = roomId;
    },
    isActiveRoom: (roomId: string) => activeRoomRef.current === roomId,
    activeRoomRef,
  };
}
