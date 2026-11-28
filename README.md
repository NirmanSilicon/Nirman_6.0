# Manas — Cyber Coders

**Mindful Assistance – Nurturing and Safety, Every Step of the Way**

Manas is an Android-first Flutter prototype for a BCA first-year project. The demo
works without Firebase; Firebase Authentication, Firestore, callable Cloud
Functions, push alerts, and Google Places are opt-in integrations.

## Project layout

```text
android/
  app/src/main/AndroidManifest.xml    Android permissions and app entry metadata
functions/
  index.js                            Zedtron and trusted-contact Cloud Functions
  package.json                        Cloud Functions runtime dependencies
lib/
  main.dart                           App startup, theme, and saved-session routing
  models/                             Profile and mood data structures
  screens/                            Login, registration, home, SOS, Zedtron, mood UI
  services/                           Auth, encryption, Firebase, location, and data logic
  widgets/                            Shared cinematic circuit background
assets/data/daily_quotes.json         365 bundled daily reminders
firebase.json                        Firebase deployment configuration
firestore.rules                      Per-user data access rules
```

## Run the demo

1. Install Flutter (3.47 or newer), Android Studio/Android SDK, and JDK 17. Connect
   an Android device or start an emulator.
2. From the repository root:

   ```powershell
   flutter pub get
   flutter run
   ```

3. Enter any 10-digit Indian mobile number. In demo mode, the fixed OTP is
   **459459**. Add a name, email, and a 10-digit trusted-contact number.
4. Try the home grid, select a mood, open Mood Tracker, and enter Zedtron. The
   offline assistant offers a few safe sample replies.
5. Test SOS only with a device/SIM and a trusted number you control. The app
   requests location and SMS permission only after the cancelable 3-second
   countdown. A confirmed SOS sends a real SMS and may incur carrier charges.
   The emergency-call buttons open the phone app; they do not place a call
   without the user's confirmation.

### Test each screen

- **Login / registration:** Sign out from Settings, request the demo code, test
  invalid numbers and emails, then save a valid profile.
- **Home:** Check the daily quote, tap a mood (saved quietly), and open each tile.
- **SOS:** Use a test proxy number, cancel the countdown once, then test a
  confirmed alert with location and with location permission denied. Call 112
  only in a genuine emergency.
- **Zedtron hologram / chat:** Tap the hologram, send a sample message, try the
  English/Hindi selector, and try voice input on a device with speech services.
- **Mood history:** Save check-ins on multiple days to see the calendar and trend.
  The five-day prompt appears after low-mood check-ins on five consecutive days.

Run the focused checks:

```powershell
flutter test
flutter analyze
npm --prefix functions run lint
```

## Enable Firebase and live services

1. Create a Firebase project and register an Android app with package ID
   `com.cybercoders.manas`. Download its `google-services.json` into
   `android/app/` (do not commit it).
2. Enable **Phone** in Firebase Authentication and create a Firestore database.
   For development, configure Firebase test phone numbers. When Firebase is
   enabled, the app uses Firebase's real phone verification; the fixed OTP works
   only when Firebase mode is off.
3. Install Firebase CLI and Node.js 20. From the repository root, select the
   Firebase project, install function dependencies, set the server-side LLM
   secret, and deploy:

   ```powershell
   firebase login
   firebase use YOUR_FIREBASE_PROJECT_ID
   npm --prefix functions install
   firebase functions:secrets:set LLM_API_KEY
   firebase deploy --only functions,firestore:rules
   ```

   `LLM_API_KEY` is stored in Cloud Functions Secret Manager and is never placed
   in Flutter source or build arguments. `ZEDTRON_MODEL` may be configured as a
   Cloud Functions environment variable; the default is `gpt-4o-mini`.
4. For Android push alerts, enable Firebase Cloud Messaging. A trusted contact
   must also have Manas installed, sign in with their verified mobile number,
   and register the device. SMS is still sent independently. Enable Firebase
   App Check before production deployment and configure its provider in Firebase.
5. Enable Google Places API (Places API, legacy Nearby Search and Place Details)
   and billing in Google Cloud. Restrict the key to this Android package and your
   signing certificate; do not commit it. Run:

   ```powershell
   flutter run --dart-define=FIREBASE_ENABLED=true --dart-define=PLACES_API_KEY=YOUR_RESTRICTED_PLACES_KEY
   ```

   Firebase initialization reads the native Android configuration. The app
   applies the Google Services Gradle plugin only when `google-services.json`
   exists, so demo builds do not need Firebase files.

## Prototype boundaries and privacy

- Profile, mood, and SOS event payloads are AES-GCM encrypted with an
  installation key held by Android secure storage before being stored locally
  or in Firestore. The encrypted Firestore payload is not recoverable on another
  device unless you add a secure key-recovery design.
- Location is requested and shared only during an SOS. Live location and SMS
  updates run while the SOS screen remains open; reliable background sharing
  needs an Android foreground-service implementation and additional review.
- The SMS plugin sends through the device SIM after explicit SOS confirmation.
  Android permission, SIM/network availability, and carrier behavior can prevent
  delivery. The app also provides a direct 112 call shortcut.
- Push alerts are routed only to a trusted contact who has registered Manas with
  the same verified phone number. If no such device is registered, SMS remains
  the primary alert.
- Google Places is optional. Without a restricted Places key or internet,
  station lookup is unavailable, but the 112 call option remains visible.
- This is a student prototype, not a certified emergency service. Test on
  non-emergency numbers and do not rely on it as the sole safety plan.
