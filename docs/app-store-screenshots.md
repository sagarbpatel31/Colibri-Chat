# App Store Screenshots Guide

## Required Sizes

You need screenshots for at least one device size. Apple recommends all three:

| Device | Size (pixels) | Required? |
|--------|--------------|-----------|
| **6.7" iPhone** (iPhone 15 Pro Max) | 1290 x 2796 | Required |
| **6.5" iPhone** (iPhone 11 Pro Max) | 1242 x 2688 | Optional but recommended |
| **5.5" iPhone** (iPhone 8 Plus) | 1242 x 2208 | Optional |

- Minimum: 3 screenshots per size
- Maximum: 10 screenshots per size
- Format: PNG or JPEG, no transparency

---

## Suggested Screenshots (6 screens)

Take these from the TestFlight app or iOS Simulator:

### Screenshot 1: Age Gate
- Shows the "18+" verification screen
- Caption: **"Adults only. Privacy first."**

### Screenshot 2: Nearby Rooms
- Shows the room list with a few rooms, member counts, type badges
- Caption: **"Discover rooms around you."**

### Screenshot 3: Create Room
- Shows the Create Room form with name field and type picker
- Caption: **"Start a room anywhere."**

### Screenshot 4: Chat Room (with messages)
- Shows an active chat with a few messages, timestamps, presence count
- Caption: **"Talk to people nearby. Messages vanish in 60 minutes."**

### Screenshot 5: Empty Chat Room
- Shows the empty state with "No messages yet" and the composer
- Caption: **"Be the first to say something."**

### Screenshot 6: Report Modal
- Shows the report UI with reason options
- Caption: **"Built-in moderation keeps everyone safe."**

---

## How to Take Screenshots

### From iOS Simulator (recommended for consistent sizes)
1. Run the app in Xcode Simulator with the target device
2. Press `Cmd + S` to save a screenshot
3. Screenshots go to your Desktop

### From TestFlight on a real device
1. Open the app on your iPhone
2. Navigate to the desired screen
3. Press `Side button + Volume Up` simultaneously
4. Find screenshots in Photos app
5. AirDrop or export at full resolution

---

## Tips
- Use a clean state (delete old rooms, create fresh test data)
- Show realistic but appropriate content in chat messages
- Avoid any personal information in screenshots
- Make sure the status bar shows full battery and good signal
- Time should look clean (e.g., 9:41 AM — Apple's default)
- On Simulator, set `Device > Appearance > Light` for consistency
