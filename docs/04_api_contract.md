# API Contract — v0 (Supabase RPC + Realtime)

## Authentication
Supabase Auth (anonymous or phone/email later). All RPC calls require `Authorization: Bearer <jwt>`.

---

## RPC: get_nearby_rooms
**Call:** `supabase.rpc("get_nearby_rooms", { p_lat, p_lng, p_accuracy_m, p_limit })`

**Response rows:**
- id, room_type, name, radius_m, tolerance_m, starts_at, ends_at, distance_m, is_active

---

## RPC: join_room
**Call:** `supabase.rpc("join_room", { p_room_id, p_lat, p_lng, p_accuracy_m })`

**Returns:**
- room_id, user_id, alias

**Errors (message contains code):**
- not_authenticated
- room_not_found
- room_not_active
- outside_geofence
- invalid_accuracy

---

## RPC: heartbeat
**Call:** `supabase.rpc("heartbeat", { p_room_id, p_lat, p_lng, p_accuracy_m })`

**Returns:**
- room_id, user_id, is_present, distance_m

---

## RPC: send_message
**Call:** `supabase.rpc("send_message", { p_room_id, p_text, p_lat, p_lng, p_accuracy_m })`

**Returns:**
- message_id, created_at, expires_at

**Errors:**
- not_authenticated
- not_a_member
- room_not_found
- room_not_active
- low_accuracy
- outside_geofence
- rate_limited
- message_too_long
- pii_blocked
- content_blocked
- shadow_muted

---

## RPC: report_message
**Call:** `supabase.rpc("report_message", { p_room_id, p_message_id, p_reason })`

**Returns:**
- report_id, shadow_muted

---

## Realtime Subscriptions
### Messages in a room
Subscribe to `public:messages` with filter:
- `room_id = eq.<room_id>`
Client should query only active/unexpired messages:
- `select * from messages where room_id = ? and expires_at > now() and status='active' order by created_at desc limit 50`

Realtime will push inserts; client should ignore if `expires_at <= now()`.

### Presence (optional v0)
Subscribe to `public:room_members` changes for room to update present/away indicators.