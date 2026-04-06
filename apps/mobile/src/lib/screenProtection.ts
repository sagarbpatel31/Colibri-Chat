import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

/**
 * Activates screen capture protection:
 * - Android: sets FLAG_SECURE (blocks screenshots and screen recording)
 * - iOS: listens for screenshot events and shows a warning
 * Wrapped in try-catch for Expo Go compatibility (native module may not exist)
 */
export function useScreenProtection() {
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    try {
      const ScreenCapture = require('expo-screen-capture');

      if (Platform.OS === 'android') {
        ScreenCapture.preventScreenCaptureAsync().catch(() => {});
      }

      subscription = ScreenCapture.addScreenshotListener(() => {
        Alert.alert(
          'Screenshot detected',
          "For everyone's privacy, please avoid sharing screenshots of conversations.",
        );
      });
    } catch {
      // expo-screen-capture not available (e.g., Expo Go)
    }

    return () => {
      try {
        if (Platform.OS === 'android') {
          const ScreenCapture = require('expo-screen-capture');
          ScreenCapture.allowScreenCaptureAsync().catch(() => {});
        }
        subscription?.remove();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);
}
