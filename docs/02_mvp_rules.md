# MVP Rules (Hard Requirements) — v0

## Room Types
### Neighborhood Room
- Always “active”
- Messages expire in **60 minutes** from send time

### Event Room
- Active only within: `starts_at <= now <= ends_at`
- Messages expire at: `expires_at = LEAST(created_at + 60 minutes, ends_at)`

## Geo Rules
- Base radius: **100 ft ≈ 30m**
- Tolerance: **±20 ft ≈ 6m**
- Allowed if: `distance_m <= radius_m + tolerance_m` (default 30 + 6)

## Location Accuracy Gate
- Posting allowed only if: `accuracy_m <= 25m` (configurable)
- If accuracy is poor:
  - user can read
  - user cannot post (error: `low_accuracy`)

## Presence & Heartbeat
- Client sends heartbeat every 20–30 seconds:
  - lat/lng/accuracy + room_id
- A member is “present” if:
  - last heartbeat <= 60 seconds ago AND
  - last heartbeat location inside geofence AND
  - accuracy gate satisfied
- UI greys messages if sender is not “present”.

## Messaging
- Message length <= **200 chars**
- Rate limit: **1 message / 5 seconds** per user per room
- Prohibited in public chat:
  - phone numbers
  - emails
  - social handles (basic detection for @username / “instagram:” etc.)
- Basic profanity / explicit sexual content filter enabled (v0 minimal)

## Reporting
- One-tap report
- Reported message is hidden locally immediately
- Backend records report
- Shadow mute threshold (v0):
  - If a user receives >= 3 unique reports in same room within 10 minutes -> `shadow_mute = true` for that room

## Screenshot / Recording
- We do not claim full prevention.
- Client may:
  - detect screenshot events (iOS)
  - optionally blur UI briefly + warn user
  - optionally set secure flag on Android to discourage recording