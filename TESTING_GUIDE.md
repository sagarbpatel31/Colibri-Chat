# Colibri Chat Testing Guide

## Setup Instructions

### 1. Clear Cache and Start Fresh
- ✅ Already cleared Expo cache
- Start development server: `npx expo start --clear`
- Scan QR code with Expo Go app

### 2. Database Setup
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. **IMPORTANT**: Edit `supabase/test_data_local.sql` first:
   - Replace `YOUR_LAT` and `YOUR_LNG` with your actual coordinates
   - Use https://www.latlong.net/ to find your location
4. Run the modified SQL script in Supabase SQL Editor
5. Verify rooms were created: `SELECT * FROM public.rooms WHERE name LIKE '%Test%';`

### 3. Location Services
- Enable location permissions when prompted
- Ensure GPS accuracy is good (outdoor/near windows)
- The app requires accuracy ≤ 25 meters

---

## Acceptance Tests - Step by Step

### 📍 **Geo & Presence Tests (1-5)**

#### Test 1: Outside Geofence
**Goal**: Verify "outside_geofence" error when too far from room
1. Open app, grant location permission
2. Should see "No active rooms nearby" or list without "Far Away Test Room"
3. If you see "Far Away Test Room", try joining it
4. **Expected**: Error message "You are outside the room boundary"

#### Test 2: Inside Geofence
**Goal**: Successfully join room when inside radius
1. You should see "Local Test Room 1", "Local Test Room 2", etc.
2. Tap any local test room
3. **Expected**: Successfully enters chat room

#### Test 3: Low Accuracy
**Goal**: Test accuracy validation
1. Go to phone settings, turn off WiFi (forces less accurate GPS)
2. Try joining a room or sending a message
3. **Expected**: "Accuracy too low" error or posting disabled

#### Test 4: Presence Changes
**Goal**: Test heartbeat system
1. Join a room successfully
2. Walk far away (outside 100ft radius) while staying in the app
3. Wait 25+ seconds for heartbeat
4. **Expected**: Banner shows "You are outside the room boundary"

#### Test 5: Message Greying
**Goal**: Messages grey when sender leaves
1. Need 2 devices/accounts for this test
2. Both join same room, send messages
3. One person leaves geofence area
4. **Expected**: Their messages appear greyed out

---

### ⏰ **TTL Tests (6-12)**

#### Test 6-7: Neighborhood TTL
1. Join "Local Test Room 1" (neighborhood type)
2. Send a message
3. Check database: `SELECT text, created_at, expires_at FROM messages ORDER BY created_at DESC LIMIT 1;`
4. **Expected**: expires_at = created_at + 60 minutes

#### Test 8-9: Event Timing
1. Try joining "Future Test Event" (starts in 1 hour)
2. **Expected**: Error "This event has not started yet"
3. Join "Local Coffee Meetup" (currently active)
4. **Expected**: Success

#### Test 10: Event Message TTL
1. In active event room, send message
2. Check database for expires_at
3. **Expected**: expires_at = min(created_at + 60min, event.ends_at)

---

### ✏️ **Message Limits (13-14)**

#### Test 13: Long Messages
1. In any joined room, type 201+ characters
2. Try to send
3. **Expected**: "Message must be 200 characters or less"

#### Test 14: Empty Messages
1. Try sending empty message or just spaces
2. **Expected**: "Message cannot be empty"

---

### ⏱️ **Rate Limiting (15-16)**

#### Test 15: Rate Limit
1. Send a message successfully
2. Immediately try sending another
3. **Expected**: "Slow down. You can post once every 5 seconds"

#### Test 16: Rate Limit Recovery
1. After getting rate limited, wait 6+ seconds
2. Try sending again
3. **Expected**: Message sends successfully

---

### 🔒 **PII & Content Filters (17-20)**

#### Test 17: Email Blocking
Try sending: "Contact me at test@example.com"
**Expected**: "That message looks like personal info"

#### Test 18: Phone Blocking
Try sending: "Call me at 555-123-4567"
**Expected**: "That message looks like personal info"

#### Test 19: Social Handle Blocking
Try sending: "Follow me @username"
**Expected**: "That message looks like personal info"

#### Test 20: Content Blocking
Try sending messages with: "porn", "nude", "sex"
**Expected**: "That message violates content rules"

---

### 🚨 **Reporting & Shadow Mute (21-23)**

#### Test 21: Basic Reporting
1. Long-press any message
2. Fill out report modal
3. Submit report
4. **Expected**: Report submitted successfully

#### Test 22-23: Shadow Mute (Complex)
*Requires multiple accounts - can simulate in database*
1. Three different users report same person within 10 minutes
2. Check: `SELECT is_shadow_muted FROM room_members WHERE user_id = 'target_user';`
3. Shadow muted user tries to send message
4. **Expected**: "Your messages are temporarily restricted"

---

### 🔐 **Security Tests (24-27)**

#### Test 24-25: RLS (Row Level Security)
*Database level test*
```sql
-- Test as different user (change session)
SET SESSION ROLE anon;
SELECT * FROM messages WHERE room_id = 'room_you_are_not_in';
-- Expected: No results
```

#### Test 27: Direct Insert Blocked
*Try in Supabase SQL Editor*
```sql
INSERT INTO messages (room_id, user_id, text) VALUES ('any-room', 'any-user', 'test');
-- Expected: Permission denied
```

---

### 📡 **Real-time Tests (28-29)**

#### Test 28: Live Messages
1. Have app open in room
2. Use another device/account to send message in same room
3. **Expected**: Message appears immediately without refresh

#### Test 29: Expired Message Filtering
1. Send message in room
2. Manually update database to set expires_at to past time
3. Refresh app
4. **Expected**: Expired message doesn't appear

---

## Common Issues & Solutions

### ❌ **No Rooms Showing**
- Check GPS accuracy (go outdoors)
- Verify test data was inserted at your coordinates
- Check location permissions

### ❌ **Can't Join Rooms**
- Ensure you're within 100ft (30m + 6m tolerance) of test room coordinates
- Check GPS accuracy ≤ 25m
- Verify room is active (for events)

### ❌ **App Not Updating**
- Force close Expo Go app
- Clear cache: `npx expo start --clear`
- Re-scan QR code

### ❌ **Database Errors**
- Check Supabase connection
- Verify environment variables in `.env`
- Check RLS policies are applied

---

## Quick Test Commands

**Check your coordinates:**
```sql
SELECT ST_Y(center::geometry) as lat, ST_X(center::geometry) as lng
FROM rooms WHERE name LIKE '%Local Test%' LIMIT 1;
```

**See all test rooms:**
```sql
SELECT name, room_type,
       ST_Y(center::geometry) as lat,
       ST_X(center::geometry) as lng,
       CASE
         WHEN room_type = 'event' THEN starts_at || ' to ' || ends_at
         ELSE 'Always active'
       END as schedule
FROM rooms WHERE name LIKE '%Test%';
```

**Check recent messages:**
```sql
SELECT alias, text, created_at, expires_at
FROM messages
ORDER BY created_at DESC
LIMIT 10;
```