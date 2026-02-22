# System Architecture — v0 (Supabase + Postgres RPC)

## Components
### Mobile Client (Expo)
- Requires location permission
- Shows nearby rooms
- Join room -> starts heartbeat loop
- Subscribes to realtime messages (Supabase Realtime)
- Sends messages via RPC (or Edge wrapper)

### Supabase Postgres (Source of Truth)
- Tables: rooms, room_members, messages, reports, moderation_events
- RLS enforces membership access
- RPC functions implement business rules:
  - get_nearby_rooms
  - join_room
  - heartbeat
  - send_message (validates geofence + TTL + rate limit + filters)
  - report_message (and shadow mute logic)

### Supabase Realtime
- Client subscribes to:
  - messages inserted for room_id
  - optionally room_members updates for presence

## Data Retention Philosophy
- Messages are ephemeral: expire_at enforced and queried
- Moderation events are retained longer (30–90 days) for abuse handling / legal defense

## Flow (High Level)
1) Client obtains lat/lng/accuracy.
2) Client calls RPC `get_nearby_rooms(lat, lng, accuracy_m)`.
3) Client calls RPC `join_room(room_id, lat, lng, accuracy_m)` → returns alias + joined membership.
4) Client heartbeats periodically via RPC `heartbeat(room_id, lat, lng, accuracy_m)`.
5) Client sends messages via RPC `send_message(room_id, text, lat, lng, accuracy_m)`.
6) Messages insert triggers realtime update.
7) Reports via RPC `report_message(room_id, message_id, reason)`; system may shadow mute.

## Threats Addressed (v0)
- Geo spoof / poor accuracy → server-side validation + accuracy gate
- Spam → rate limit and report-triggered shadow mute
- PII sharing → regex detection + block
- Harassment → reporting and shadow mute