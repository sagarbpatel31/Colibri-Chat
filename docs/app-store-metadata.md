# App Store Metadata — Colibri Chat

Use this document to fill in all fields in App Store Connect.

---

## Basic Info

| Field | Value |
|-------|-------|
| **App Name** | Colibri Chat |
| **Subtitle** (30 chars) | Nearby. Ephemeral. Anonymous. |
| **Bundle ID** | com.colibrichat.app |
| **Primary Category** | Social Networking |
| **Secondary Category** | Lifestyle |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 17+ (see questionnaire below) |

---

## Description (4000 chars max)

```
Chat with people nearby. No accounts. No history. Messages disappear.

Colibri Chat is a proximity-based messaging app that lets you talk to people physically around you — at a coffee shop, concert, park, or neighborhood block. Every conversation is ephemeral: messages automatically vanish after 60 minutes.

HOW IT WORKS
- Open the app and discover chat rooms within walking distance
- Join a room to start chatting with everyone inside the geofence
- Create your own room for your location or event
- Messages expire automatically — nothing is stored permanently

PRIVACY BY DESIGN
- No account required — you're anonymous from the start
- Each room gives you a random alias (like "User-a3f1b2")
- No email, phone number, or personal info collected
- Messages auto-delete after 60 minutes
- Personal info (emails, phone numbers, social handles) is automatically filtered

SAFE & MODERATED
- Comprehensive content filtering blocks profanity, hate speech, explicit content, threats, and spam
- Smart detection catches evasion tricks (leetspeak, spacing, symbols)
- Users who repeatedly violate rules get automatic timeouts
- Long-press any message to report it — 3 reports trigger automatic action
- Screenshot detection alerts users to protect conversation privacy

TWO ROOM TYPES
- Neighborhood rooms: Always active, perfect for your block or hangout spot
- Event rooms: Time-limited rooms for concerts, meetups, sports games, or parties

BUILT FOR THE MOMENT
Colibri Chat is designed for the here and now. No scrolling through old messages, no follower counts, no profiles. Just real-time conversation with the people around you.

Adults only (18+). Location permission required.
```

---

## Keywords (100 chars max, comma-separated)

```
nearby,chat,local,anonymous,ephemeral,proximity,location,rooms,neighborhood,event,messaging
```

---

## What's New (for version 1.0.0)

```
Initial release of Colibri Chat — proximity-based ephemeral messaging.
```

---

## URLs (fill in before submission)

| Field | Value |
|-------|-------|
| **Privacy Policy URL** | `<!-- HOST privacy-policy.html AND PUT URL HERE -->` |
| **Support URL** | `<!-- YOUR WEBSITE OR EMAIL LINK -->` |
| **Marketing URL** (optional) | — |

---

## Support Email

```
<!-- REPLACE WITH YOUR EMAIL -->
support@colibrichat.app
```

---

## Age Rating Questionnaire

Answer these in App Store Connect under "Age Rating":

| Question | Answer |
|----------|--------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Profanity or Crude Humor | Infrequent/Mild |
| Mature/Suggestive Themes | Infrequent/Mild |
| Horror/Fear Themes | None |
| Medical/Treatment Information | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Unrestricted Web Access | None |
| Gambling with Real Currency | None |

**Additional declarations:**
- Made for Kids: **No**
- Contains user-generated content: **Yes** (chat messages)
- Age restriction: **17+** (due to user-generated content + in-app age gate)

---

## App Privacy (Data Collection Form)

Fill this in under "App Privacy" in App Store Connect:

### Data Types Collected

**1. Location — Precise Location**
- Purpose: **App Functionality**
- Linked to user: **No**
- Used for tracking: **No**

**2. Identifiers — Device ID**
- Purpose: **App Functionality**
- Linked to user: **No**
- Used for tracking: **No**

**3. User Content — Other User Content** (chat messages)
- Purpose: **App Functionality**
- Linked to user: **No**
- Used for tracking: **No**

### Data NOT Collected
- Contact Info (name, email, phone)
- Health & Fitness
- Financial Info
- Browsing History
- Search History
- Purchases
- Photos or Videos
- Contacts
- Diagnostics
- Sensitive Info

---

## Review Notes (for Apple reviewers)

```
Colibri Chat is a proximity-based ephemeral chat app for adults (18+).

To test the app:
1. Allow location access when prompted
2. Confirm you are 18+ on the age gate screen
3. The app shows nearby chat rooms within ~200m of your location
4. Tap "+ New" to create a test room at your current location
5. Enter the room and send a test message
6. Messages automatically expire after 60 minutes

Notes:
- The app requires location permission to function (geofence-based)
- No account/login is needed — anonymous auth is automatic
- Content is user-generated and moderated via automated filters
- The app includes an age gate (18+) on first launch
```

---

## Screenshots Required

See `app-store-screenshots.md` for specs and suggested screens.
