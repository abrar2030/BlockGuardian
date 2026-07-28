# BlockGuardian — Mobile Frontend

An Expo (React Native) app for BlockGuardian, sharing the same visual language, feature set, and backend integration as `web-frontend`.

## What's here

The app always opens on the **Home screen**; users sign up or sign in from there before reaching the dashboard.

| Screen           | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| Home             | Landing screen — Get Started / Sign In                      |
| Login            | Sign in (supports two-factor authentication)                |
| Register         | Sign up                                                     |
| Dashboard (tab)  | Authenticated overview across all portfolios                |
| Portfolios (tab) | List / create portfolios                                    |
| PortfolioDetail  | Overview, Holdings, Transactions, Analytics, Settings       |
| Markets (tab)    | Browse and search tradeable assets                          |
| Account (tab)    | Profile, password, and two-factor authentication management |

Every screen talks to the same real, verified Flask backend endpoints as the web app — nothing is mocked. Screens with no backing API in the original codebase (an admin panel, AI recommendations, a blockchain explorer, and a wallet-address "security check") were intentionally not carried over; see the top-level summary for details.

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit EXPO_PUBLIC_API_URL
npx expo start
```

On a physical device, `localhost` won't reach your computer — set `EXPO_PUBLIC_API_URL` to your machine's LAN IP instead (e.g. `http://192.168.1.20:5000`), and make sure the backend's `CORS_ORIGINS` allows it in non-development configs.

The app expects the backend from `code/backend` running locally. Seed it with sample assets and a demo account via:

```bash
python src/database/init_db.py
```

Demo login: `demo@blockguardian.com` / `DemoPassword123!`

## Architecture notes

- `src/lib/api.js` — fetch-based client with AsyncStorage-backed token persistence and automatic refresh-on-401; `authAPI`, `portfolioAPI`, `assetAPI` mirror the web app's service layer exactly.
- `src/context/AuthContext.js` / `ToastContext.js` — session state and toast notifications.
- `src/navigation/AppNavigator.js` — root stack (Home, Login, Register, Main, PortfolioDetail) wrapping a bottom-tab navigator (Dashboard, Portfolios, Markets, Account).
- `src/components/RequireAuth.js` — guards protected screens, redirecting to Login when the session is missing.
- `src/components/` — Button, Input, Select, Card, Badge, EmptyState, StatCard, Tabs, Screen (safe-area wrapper), AppModal (bottom-sheet dialogs).
- `src/components/portfolio/` — `TradeModal`, `CreatePortfolioModal`, `PortfolioSettingsSheet`.
- `src/components/account/` — `MfaSetupSheet` (QR code + backup codes flow).
- `src/theme/colors.js` — design tokens shared conceptually with the web app (same indigo/violet/slate palette).

The app currently ships as a fixed dark theme (matching the web app's dark mode) rather than a light/dark toggle, since a single well-tuned theme is more reliable to ship across devices than an untested light variant.

## Testing

```bash
npm test
```

## Known environment note

This project's `babel.config.js` previously placed `nativewind/babel` in the `plugins` array. In the installed NativeWind v4 version, that entry point exports a **preset** (a function returning `{ plugins: [...] }`), not a plugin — so treating it as a plugin broke every Metro/Jest build with `.plugins is not a valid Plugin property`, regardless of any app code. This was fixed by moving it into `presets`. If you see this error again after a dependency bump, it's the first place to check.
