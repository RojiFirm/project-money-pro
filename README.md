# Project Money PRO

Advanced personal finance management web app — transactions, transfers,
liabilities, assets, savings goals, a configurable tax rules engine, and
unified dashboards, built on vanilla HTML/CSS/JS with Supabase as the backend.

## Project structure

```
money-pro/
├── index.html                  # App shell (sidebar + navbar + route outlet)
├── core/
│   ├── config.js                # Supabase client setup (fill in your keys)
│   ├── api.js                   # Generic CRUD service (+ in-memory offline fallback)
│   ├── database.js               # Per-table services, tax engine, dashboard aggregations
│   ├── router.js                 # Hash-based SPA router
│   ├── app.js                    # Bootstraps the app, registers routes
│   └── utils.js                  # Formatting & small helpers
├── components/
│   ├── sidebar/                  # Left nav (numbered per the build roadmap)
│   ├── navbar/                   # Top date strip + toast container styles
│   └── modal/                    # Reusable dialog used by every "New X" form
├── pages/
│   ├── settings/                 # Control Center: categories, types, tax rules, system prefs
│   └── properties/
│       ├── accounts/
│       ├── transactions/
│       ├── transfer/
│       ├── liabilities/
│       ├── assets/
│       ├── savings/
│       └── dashboard/
├── assets/css/main.css           # Design tokens + shared component styles
└── database/schema.sql           # Full Supabase/Postgres schema incl. RLS
```

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of `database/schema.sql`. This
   creates every table from the spec (accounts, transactions, transfers,
   liabilities, liability_payments, assets, savings_goals, tax_rules, and
   all the Settings/lookup tables), plus Row Level Security policies scoped
   to `auth.uid()`.
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.
4. Paste them into `core/config.js`:

   ```js
   export const SUPABASE_URL = 'https://xxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...';
   ```

Until you do this, the app runs in **offline mode** — every page works
against an in-memory store so you can build and click through the UI
without a live backend. Data won't persist across reloads in that mode.

## 2. Run locally

Because pages load via `fetch()` and ES module `import`, you need a local
HTTP server (not `file://`):

```bash
cd money-pro
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed local URL in your browser.

## 3. Authentication

The schema's RLS policies key everything off `auth.uid()`, so you'll need
to add a sign-in flow (Supabase Auth supports email/password, magic link,
or OAuth) before writes will succeed against a real project. That wasn't
in the diagram's page list, so it isn't scaffolded yet — happy to add a
`pages/auth/` module with Supabase Auth wired in if you want it next.

## 4. How the tax engine works

`core/database.js` → `calculateTax(draftTransaction)` pulls all `active`
rows from `tax_rules`, runs each one through `ruleMatches()` (checking
transaction type, category, account, and min/max amount), and sums the
matching rates against the transaction amount. Rules run in `priority`
order and stack — this mirrors the "Trigger Detection → Rule Matching →
Tax Calculation" flow in the spec. Manage rules from **Settings → Tax Rules**.

## 5. What's stubbed vs. fully wired

- **Fully wired**: CRUD for accounts, transactions (with live tax
  calculation + account balance updates), transfers, liabilities +
  payments, assets, savings goals, all Settings lookup tables, and the
  Dashboard's balance sheet / cash flow / insights.
- **Not yet built**: user authentication UI, CSV/PDF export, and
  Realtime live-sync across browser tabs (the `subscribe()` helper in
  `core/api.js` is ready for it — just call it from a page's `init()`).

## Tech stack

HTML/CSS/JS · Supabase (Postgres, Auth, RLS, Realtime, Storage) · deploy to
Vercel or Netlify.
