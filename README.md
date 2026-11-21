# SemesterOS

SemesterOS is a dark-mode personal student workspace. Phase 1 includes the responsive app shell, dashboard preview, placeholder module routes, and a Supabase client entry point.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open the local URL printed by Vite. The app runs without Supabase credentials; the dashboard currently uses clearly labelled sample data.

To prepare a Supabase connection, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. These are browser-visible public values. Never put a service-role key or other secret in a `VITE_` variable. Configure row-level security before using the anon key with real user data.

## Scripts

- `npm run dev` — start the Vite development server
- `npm run build` — type-check and create a production build
- `npm run preview` — preview the production build locally

## Phase 1 scope

The Dashboard is a visual preview. Other navigation destinations are intentional placeholders. No authentication flow, database schema, persistence, or real progress calculations are included yet.
