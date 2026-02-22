# Colibri Chat Mobile (v0)

## Setup

1. Create `apps/mobile/.env` with your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

2. Install dependencies and start Expo:

```bash
cd apps/mobile
npm install
npx expo start
```

## Environment notes

- The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` at runtime.
- Expo automatically exposes `EXPO_PUBLIC_` variables to the client bundle.

## Acceptance test checklist mapping

- [ ] Geo & Presence: `apps/mobile/src/lib/presence.ts`, `apps/mobile/src/screens/ChatRoomScreen.tsx`, `apps/mobile/src/screens/NearbyRoomsScreen.tsx`
- [ ] Neighborhood TTL: `apps/mobile/src/screens/ChatRoomScreen.tsx` (fetch + realtime expiry filtering)
- [ ] Event Timing + TTL: `apps/mobile/src/screens/NearbyRoomsScreen.tsx`, `apps/mobile/src/screens/ChatRoomScreen.tsx`
- [ ] Message Limits: `apps/mobile/src/screens/ChatRoomScreen.tsx` (200-char enforcement + error handling)
- [ ] Rate Limiting: `apps/mobile/src/screens/ChatRoomScreen.tsx`
- [ ] PII & Content Filters: `apps/mobile/src/screens/ChatRoomScreen.tsx`
- [ ] Reporting & Shadow Mute: `apps/mobile/src/screens/ReportModal.tsx`, `apps/mobile/src/screens/ChatRoomScreen.tsx`
- [ ] RLS: `apps/mobile/src/screens/ChatRoomScreen.tsx` (read-only queries), `apps/mobile/src/lib/rpc.ts` (writes via RPC)
- [ ] Realtime: `apps/mobile/src/screens/ChatRoomScreen.tsx` (message + room_members subscriptions)
