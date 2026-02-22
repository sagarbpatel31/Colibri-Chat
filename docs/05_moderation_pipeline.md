# Moderation Pipeline — v0

## Goals
- Prevent PII sharing in public chat
- Prevent explicit sexual content & abusive content (v0 minimal)
- Provide reporting & shadow mute

## On Send (server-side in RPC send_message)
1) Validate membership
2) Validate event time window (if event)
3) Validate location accuracy <= 25m
4) Validate distance <= radius + tolerance
5) Enforce rate limit (1 msg/5s)
6) Block PII:
   - email regex
   - phone-ish regex
   - @handle patterns + keywords (instagram/whatsapp/telegram/snap)
7) Block explicit keywords (placeholder list)
8) Insert message with expires_at

## Reporting
- Report inserts into `reports`
- Create `moderation_events` row (retained 30 days)
- If >=3 reports for same sender in same room within 10 minutes:
  - set `room_members.is_shadow_muted = true`
  - record `moderation_events.shadow_mute`

## Notes
- v0 filters are basic heuristics; upgrade later to ML moderation.
- Screenshot prevention cannot be fully guaranteed; implement deterrence only.