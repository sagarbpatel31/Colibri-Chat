import * as Location from 'expo-location';

export type GeoLocation = {
  lat: number;
  lng: number;
  accuracyM: number;
};

export async function getPermissionStatus(): Promise<Location.PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

export async function requestLocationPermission(): Promise<Location.PermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status;
}

export async function getCurrentLocation(): Promise<GeoLocation> {
  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracyM: Math.round(position.coords.accuracy ?? 0),
    };
  } catch (error) {
    const fallback = await Location.getLastKnownPositionAsync();
    if (!fallback) {
      throw error;
    }

    return {
      lat: fallback.coords.latitude,
      lng: fallback.coords.longitude,
      accuracyM: Math.round(fallback.coords.accuracy ?? 0),
    };
  }
}
