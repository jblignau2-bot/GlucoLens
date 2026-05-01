# Local Testing

Use this loop before pushing and triggering APK builds.

## Mobile UI Only

From `glucolens-mobile`:

```powershell
npx expo start --offline --clear
```

For emulator-only UI testing, set this in `glucolens-mobile/.env`:

```env
EXPO_PUBLIC_SKIP_ONBOARDING=true
EXPO_PUBLIC_MOCK_BOT=true
```

Those flags only work in development mode. `EXPO_PUBLIC_SKIP_ONBOARDING` skips Supabase boot/auth and onboarding so the app opens directly into the tabbed UI. `EXPO_PUBLIC_MOCK_BOT` lets the GlucoBot screen return canned coaching replies without a live API.

## Android Emulator

The Android emulator can reach Metro through:

```powershell
adb reverse tcp:8081 tcp:8081
```

Then open:

```powershell
adb shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081/--
```

## API-Backed Bot And Meal Plans

GlucoBot, meal planning, food analysis, and saved data need a working API.

For local API testing, create `glucolens-api/.env` from `glucolens-api/.env.example`, then run:

```powershell
npm run dev
```

For Android emulator API calls, set:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

For a physical phone on the same Wi-Fi, use the computer's LAN IP instead of `10.0.2.2`.

## APK Builds

Do not use APK builds for every UI iteration. Test with Expo first, then push once the UI and backend path are good.
