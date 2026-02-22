# Acceptance Tests — v0

## Geo & Presence
1. Given user is outside radius+tolerance, when calling join_room, then error `outside_geofence`.
2. Given user is inside radius+tolerance, when calling join_room, then membership row exists.
3. Given user heartbeats with accuracy > 25m, then `is_present = false`.
4. Given user is present then leaves, when heartbeat updates outside geofence, then `is_present = false`.
5. Given sender is not present, then their messages appear greyed in UI.

## Neighborhood TTL
6. Given a neighborhood room, when sending a message, then expires_at = created_at + 60 minutes.
7. Given message expires_at < now(), when fetching messages, then it is not returned.

## Event Timing + TTL
8. Given an event room before starts_at, when joining, then error `room_not_active`.
9. Given event room within window, join succeeds.
10. Given event room, send_message sets expires_at = min(created_at + 60m, ends_at).
11. Given event ends, when sending, then error `room_not_active`.
12. Given event ends, fetching messages returns none (expires_at <= now).

## Message Limits
13. Given text length > 200, send_message returns `message_too_long`.
14. Given empty message, send_message returns `empty_message`.

## Rate Limiting
15. Given a user sends a message, then sends another within 5 seconds, then error `rate_limited`.
16. Given user waits >5 seconds, then can send again.

## PII & Content Filters
17. Given message contains an email, then send_message returns `pii_blocked`.
18. Given message contains a phone-like number, then send_message returns `pii_blocked`.
19. Given message contains “@username”, then send_message returns `pii_blocked`.
20. Given message contains blocked explicit keywords, then send_message returns `content_blocked`.

## Reporting & Shadow Mute
21. Given member reports a message, report_message returns report_id.
22. Given 3 unique reporters report same sender within 10 minutes in same room, then sender is_shadow_muted = true.
23. Given shadow muted sender tries send_message, then error `shadow_muted`.

## RLS
24. Given user not in room, selecting messages from that room returns none.
25. Given user not in room, cannot read room_members of that room.
26. Given user is a member, can read messages (unexpired, active).
27. Given client tries direct insert into messages, policy blocks insert.

## Realtime
28. Given user subscribed to messages for room, when another member sends message, user receives realtime insert event.
29. Given received insert has expires_at <= now, client ignores it.