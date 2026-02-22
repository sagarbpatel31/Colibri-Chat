import { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentLocation, GeoLocation } from '../lib/location';
import { supabase } from '../lib/supabase';

export type RoomSession = {
  roomId: string;
  alias: string;
};

type HiddenByRoom = Record<string, Record<string, true>>;

type AppContextValue = {
  session: Session | null;
  ensureSession: () => Promise<void>;
  locationPermission: boolean | null;
  setLocationPermission: (value: boolean) => void;
  lastLocation: GeoLocation | null;
  refreshLocation: () => Promise<GeoLocation>;
  currentRoom: RoomSession | null;
  setCurrentRoom: (room: RoomSession | null) => void;
  hideMessage: (roomId: string, messageId: string) => void;
  isMessageHidden: (roomId: string, messageId: string) => boolean;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [lastLocation, setLastLocation] = useState<GeoLocation | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomSession | null>(null);
  const [hiddenByRoom, setHiddenByRoom] = useState<HiddenByRoom>({});

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (data.session) {
        setSession(data.session);
        return;
      }

      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (!active) return;

      if (error) {
        // eslint-disable-next-line no-console
        console.warn('Anonymous sign-in failed', error.message);
        return;
      }

      setSession(signInData.session);
    };

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const ensureSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      return;
    }

    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      throw error;
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    const location = await getCurrentLocation();
    setLastLocation(location);
    return location;
  }, []);

  const hideMessage = useCallback((roomId: string, messageId: string) => {
    setHiddenByRoom((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [messageId]: true,
      },
    }));
  }, []);

  const isMessageHidden = useCallback(
    (roomId: string, messageId: string) => Boolean(hiddenByRoom[roomId]?.[messageId]),
    [hiddenByRoom]
  );

  const value = useMemo(
    () => ({
      session,
      ensureSession,
      locationPermission,
      setLocationPermission,
      lastLocation,
      refreshLocation,
      currentRoom,
      setCurrentRoom,
      hideMessage,
      isMessageHidden,
    }),
    [
      session,
      ensureSession,
      locationPermission,
      lastLocation,
      refreshLocation,
      currentRoom,
      hideMessage,
      isMessageHidden,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
