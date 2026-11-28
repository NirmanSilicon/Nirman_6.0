# UQUAL Android app

Expo SDK 55 / React Native app for the statement scoring demo. The opening splash fades automatically into the welcome screen, then the user selects login or sign up. There is no MSME or investor workflow.

## Development

```sh
npm ci
npm run typecheck
npm run lint
npx expo start
```

Run the Python API from the repository root first. Android emulator default: `http://10.0.2.2:8000`. On a physical phone, use **Server settings** on the login screen to enter the laptop's LAN URL while both devices are on the same Wi-Fi. To build a release APK with Android SDK and JDK 17, run `npm run build:android`.

The app shows a descriptive Behaviour Index and a separate synthetic research model index. Neither is an official credit score.
