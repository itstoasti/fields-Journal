# FIELD NOTES

**FIELD NOTES** turns one travel photograph into a 4:3 landscape "Rubber Stamp Travel Field Notes Poster" featuring the preserved photo on the left (~58%) and a warm aged paper section on the right (~42%) with a minimal carved rubber-stamp and typewriter captions.

Built for **Google Play** with **Expo SDK 54**, **React Native 0.81**, **React 19**, **Expo Router**, **xAI Grok Imagine 2.0**, **Google Mobile Ads (AdMob)**, and **RevenueCat (Google Play Billing)**.

---

## Monetization & Generation Architecture

- **Note 1**: Free (no ads)
- **Note 2**: Free (no ads)
- **Note 3**: Rewarded video ad gate (Ad shown *after* tapping button, *before* generation; only `onEarnedReward` completed callback unlocks the Grok call)
- **Note 4+**: Paywall modal for \$2.99 / 20 note credits (`notes_20`)
- **Zero Gemini in Production**: Live generation uses xAI Grok Imagine image editing exclusively through the server.
- **Fail-Safe Balance Protection**: Failed or interrupted generations never consume free slots, ad slots, or user credits.
- **Durable Server Verification**: Entitlement state is tracked in a local SQLite store keyed by installation ID + RevenueCat app user ID.

---

## Project Structure

```
Field Notes/
├── app/                       # Expo Router screens
│   ├── _layout.tsx            # Root layout & theme initialization
│   ├── index.tsx              # Home screen (Saved notes grid & wordmark)
│   ├── compose.tsx            # Compose screen (Taped photo & field log)
│   ├── pressing.tsx           # Pressing generation screen (Quiet status)
│   ├── result.tsx             # Result screen (4:3 poster, Save & Share)
│   ├── settings.tsx           # Settings (Credits, restore purchases, privacy)
│   ├── privacy.tsx            # Full privacy policy & data safety
│   └── modal/
│       ├── paywall.tsx        # Paywall modal ($2.99 / 20 credits)
│       └── privacy-consent.tsx# First-run privacy disclosure sheet
├── assets/                    # Textures, icons, splash, empty-stamp
├── src/
│   ├── components/            # PaperContainer, PhotoTape, StampButton, etc.
│   ├── theme/                 # Paper colors, typewriter typography, spacing
│   ├── types/                 # TypeScript interfaces
│   ├── store/                 # Zustand app state
│   └── lib/                   # Ads, purchases, image manipulation, api
├── server/                    # Hono / Node backend API
│   ├── src/
│   │   ├── index.ts           # Hono endpoints (/v1/notes, /v1/me, /v1/credits/sync)
│   │   ├── prompt.ts          # Server-owned locked Grok prompt
│   │   ├── grok.ts            # xAI Imagine 2.0 client with retries
│   │   └── db.ts              # SQLite database & entitlement state machine
│   └── test/                  # Verification test suite
├── app.json                   # Expo & Android native plugin config
├── eas.json                   # EAS build configuration
└── package.json               # Expo SDK 54 client dependencies
```

---

## Getting Started

### 1. Prerequisites
- Node.js `>= 20.0.0`
- Android Studio & Android SDK (for Android development builds)
- EAS CLI (`npm install -g eas-cli`)

---

### 2. Configure Environment Variables

#### App Client (`.env` in root)
```bash
cp .env.example .env
```
Fill in the values:
```env
# For Android Emulator: http://10.0.2.2:3001
# For Physical device: http://<YOUR_LOCAL_IP>:3001
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001

EXPO_PUBLIC_ADMOB_APP_ID=ca-app-pub-3940256099942544~3347511713
EXPO_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-3940256099942544/5224354917
EXPO_PUBLIC_REVENUECAT_API_KEY=goog_sample_fieldnotes_key
EXPO_PUBLIC_RC_PRODUCT_NOTES_20=notes_20
```

#### Backend Server (`server/.env`)
```bash
cd server
cp .env.example .env
```
Fill in the values:
```env
PORT=3001
NODE_ENV=development
XAI_API_KEY=xai-your-api-key-here
XAI_IMAGE_MODEL=grok-imagine-image-2.0
DATABASE_PATH=./data/fieldnotes.db
```
*(If `XAI_API_KEY` is not set or set to `mock`, the server operates in mock mode for development and local testing).*

---

### 3. Running the Backend Server

```bash
cd server
npm install
npm run dev
```

To run the automated verification test suite:
```bash
cd server
npx tsx test/verify.ts
```

---

### 4. Running the Expo App

```bash
# Install client dependencies
npm install

# Start development bundler
npx expo start
```

---

### 5. Creating an Android Development Build

Because Google Mobile Ads (`react-native-google-mobile-ads`) and RevenueCat (`react-native-purchases`) require native Android modules, use an Expo Development Build:

#### Local Build & Run on Connected Android Device or Emulator:
```bash
npx expo run:android
```

#### EAS Cloud Build:
```bash
# Login to EAS
eas login

# Configure project
eas build:configure

# Build Android APK for testing
eas build --profile development --platform android
```

---

### 6. Production Google Play Setup

1. **Google AdMob**:
   - Create a Google AdMob account and register an Android App.
   - Replace `androidAppId` in `app.json` with your real AdMob App ID.
   - Create a Rewarded Video Ad Unit and set `EXPO_PUBLIC_ADMOB_REWARDED_ID`.

2. **RevenueCat & Play Console**:
   - Create a managed in-app product in Google Play Console with Product ID `notes_20` (\$2.99).
   - In RevenueCat dashboard, create an Offering and attach `notes_20`.
   - Set `EXPO_PUBLIC_REVENUECAT_API_KEY` to your RevenueCat Google API key.

3. **Data Safety Declarations**:
   - Photo processing is declared honestly in `app/privacy.tsx`: images are sent to a third-party AI provider (xAI) to generate the poster and are deleted immediately after processing without model training.

---

## Server Locked Prompt File

The locked Grok Imagine prompt is located in:
[`server/src/prompt.ts`](file:///Users/deanfieldz/Desktop/Code%20Projects/Field%20Notes/server/src/prompt.ts)

It automatically interpolates `{{PLACE}}`, `{{NUMBER}}`, `{{KEYWORD_1}}`, `{{KEYWORD_2}}`, `{{KEYWORD_3}}`, and `{{YEAR}}` while guaranteeing that the formatting, color grading, whitespace, and rubber-stamp rules remain strictly enforced by the server.
