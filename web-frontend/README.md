# BlockGuardian — Web Frontend

A modern Next.js 15 (Pages Router) frontend for the BlockGuardian portfolio management platform, fully integrated with the Flask backend in `code/backend`.

## What's here

The app is public-marketing-first: it always opens on the **Homepage**, and only authenticated users can reach the dashboard.

| Route                                      | Description                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `/`                                        | Homepage / marketing landing page                                                                      |
| `/about`, `/contact`, `/privacy`, `/terms` | Static informational pages                                                                             |
| `/login`                                   | Sign in (supports two-factor authentication)                                                           |
| `/register`                                | Sign up                                                                                                |
| `/dashboard`                               | Authenticated overview across all portfolios                                                           |
| `/portfolios`                              | List / create portfolios                                                                               |
| `/portfolios/[id]`                         | Portfolio detail — Overview, Holdings, Transactions, Analytics (performance/allocation/risk), Settings |
| `/markets`                                 | Browse and search tradeable assets                                                                     |
| `/account`                                 | Profile, password, and two-factor authentication management                                            |
| `/404`                                     | Not found page                                                                                         |

Every page above talks to a **real, verified endpoint** on the Flask backend — nothing is mocked. Features that had no backing API in the original codebase (an admin panel, AI recommendations, and a blockchain explorer) were intentionally not carried over into this rebuild; see the top-level summary for details.

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit NEXT_PUBLIC_API_URL if needed
npm run dev
```

The app expects the backend from `code/backend` running locally (defaults to `http://localhost:5000`). See `code/backend/README.md` for how to start it, and seed it with sample data via:

```bash
python src/database/init_db.py
```

This creates sample tradeable assets and a demo account (`demo@blockguardian.com` / `DemoPassword123!`) you can sign in with immediately.

## Environment variables

See `.env.example`:

- `NEXT_PUBLIC_API_URL` — base URL of the Flask backend (no trailing slash)
- `NEXT_PUBLIC_API_BASE_PATH` — API prefix, defaults to `/api`

## Architecture notes

- `services/api.js` — single axios client with token-refresh interceptor; `authAPI`, `portfolioAPI`, `assetAPI` wrap every backend route used by the UI.
- `context/AuthContext.js` — session state, hydrated from `localStorage` on load.
- `context/ThemeContext.js` — light/dark mode toggle (persisted, defaults to system preference).
- `context/ToastContext.js` — lightweight toast notifications.
- `components/layout/` — `PublicLayout` (marketing pages) and `DashboardLayout` (sidebar + topbar, wraps pages in `ProtectedRoute`).
- `components/ui/` — shared primitives (Button, Input, Select, Card, Modal, Tabs, Badge, StatCard, EmptyState, Spinner).
- `components/portfolio/` — `TradeModal` (buy/sell), `CreatePortfolioModal`, `AllocationChart`, `RiskPanel`, `PortfolioSettingsForm`.
- `lib/validators.js` — client-side validation mirroring the backend's password/username/email rules exactly, to avoid round-tripping obviously invalid input.

## Production build

```bash
npm run build
npm start
```

Note: `NEXT_PUBLIC_*` variables are inlined at **build time**. If you change `NEXT_PUBLIC_API_URL`, rebuild before starting the production server.
