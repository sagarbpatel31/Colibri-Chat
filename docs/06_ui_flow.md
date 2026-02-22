# UI Flow — v0 (Expo)

## Screens
1) **Location Permission**
   - explain why location is needed
   - block app usage until granted (v0)

2) **Nearby Rooms**
   - calls RPC get_nearby_rooms
   - shows list: name, distance, type, active state
   - if event room and not active: show starts_at

3) **Join Room**
   - call RPC join_room
   - on success: start heartbeat timer (every 20–30s)

4) **Chat Room**
   - message list (latest 50)
   - realtime subscription for inserts
   - composer (<=200 chars)
   - if outside geofence or low accuracy:
     - disable input + show banner
   - greying:
     - messages from senders who are not present should render greyed

5) **Report Modal**
   - tap message -> report reason -> call RPC report_message
   - hide message locally immediately

6) **Settings (minimal)**
   - 18+ acknowledgement
   - link to terms/safety

## UI rules
- show “accuracy low” and “outside geofence” clearly
- never show exact lat/lng publicly
- no user profiles in v0