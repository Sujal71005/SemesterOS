# SemesterOS — Project Context

## Purpose

SemesterOS is a personal student management workspace for semester academics, goals, timetable, placement preparation, skills, projects, analytics, notes, and habits. The product is being built in phases; Phase 1 provides the app foundation and dashboard presentation only.

## Stack

- React 19, Vite 6, TypeScript 5
- Tailwind CSS 4 through the official Vite plugin, plus a small set of custom CSS component/layout styles
- React Router for page navigation
- Lucide React for icons
- Recharts for dashboard study-hours visualization
- Supabase JS client configured from Vite environment variables

## Architecture

- `src/layout/` — application shell, header, and responsive sidebar
- `src/pages/` — route-level dashboard and placeholder pages
- `src/components/common/` — reusable page headings and section cards
- `src/components/dashboard/` — dashboard-specific metrics and sample-data label
- `src/lib/` — external service clients (Supabase)
- `src/types/` — shared domain types
- `src/utils/` — navigation configuration and shared helpers
- `src/assets/` — reserved for local images/fonts/icons as needed
- `src/hooks/` — reserved for reusable React hooks as data workflows are introduced
- `src/services/` — reserved for application data access and business operations

## Decisions

1. Use one route per primary navigation destination so later modules can be implemented independently.
2. Keep navigation metadata in one typed list and reuse it for the sidebar and route setup.
3. Dashboard numbers and items are static illustrative sample data, and the UI labels them as such. They are not presented as user progress.
4. Supabase is initialized only when both public environment variables exist. The app can render without credentials; no fake persistence or backend behavior is implied.
5. Never expose a Supabase service-role key in client code. Real user data requires database row-level security policies.
6. Use a dark-only color palette and responsive navigation: collapsible sidebar on desktop and an overlay drawer on mobile.
7. Placeholder pages communicate the current phase rather than simulate unfinished workflows.

## Phase 1 boundaries

Included: Vite/React/TypeScript foundation, Tailwind setup, responsive shell, main navigation, dashboard UI, Supabase client configuration, and setup documentation.

Deferred: Supabase authentication and schema, real dashboard queries, task editing, timetable CRUD, analytics calculations, notes/resources, placement tracking, and settings workflows.
