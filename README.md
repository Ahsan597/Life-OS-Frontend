# Life OS - Frontend

React frontend for Life OS, a personal habit/check-in tracker that turns daily
data into self-insight. This app talks to the Express.js + MySQL backend
(separate repo) purely over a REST JSON API.

Frontend and backend are built in phase-lockstep: this app only builds UI for
what the backend has already shipped in the current phase. See the full
phase plan in the project brief shared with the backend repo.

## Current status

Phase 0 setup is done: project scaffolding, routing, auth state, API client,
and base UI components. No feature UI has been built yet - habits,
check-ins, streaks, etc. will be added as the backend ships each phase.

## Stack

- **React 19 + TypeScript**, built with **Vite**
- **Tailwind CSS v4** for styling
- **shadcn/ui** for base components (Button, Input, Card, Dialog, Form
  pieces, etc.) - lives in `src/components/ui`, owned/editable code, not a
  package dependency
- **React Router v7** for client-side routing
- **TanStack Query (React Query)** for all server state (fetching, caching,
  mutations) - this is the only place API data should live, not component
  state
- **Zustand** for client-only state - currently just auth (`src/store/authStore.ts`),
  persisted to `localStorage` so a refresh doesn't log the user out
- **Axios** for the HTTP client, with interceptors that attach the access
  token and transparently refresh it on a 401

## Folder structure

```
src/
  api/          axios client + one file per backend resource (auth.ts, habits.ts, ...)
  components/
    layout/     Navbar, Sidebar, AppLayout - app chrome
    ui/         shadcn/ui components (generated, safe to edit directly)
  hooks/        shared React hooks (e.g. custom query/mutation hooks per resource)
  lib/          utils.ts (shadcn cn() helper), queryClient.ts
  pages/        one component per route (LoginPage, DashboardPage, ...)
  routes/       ProtectedRoute and any other route-guarding logic
  store/        Zustand stores (client-only state)
  types/        shared TypeScript types, usually mirroring backend DTOs
```

Convention going forward: when a new backend resource ships (habits,
check-ins, insights, ...), add `src/api/<resource>.ts` for the HTTP calls,
`src/hooks/use<Resource>.ts` for the React Query hooks wrapping them, and a
page/component under `pages/` or `components/` that uses the hook. Keep
server data out of Zustand and out of local component state - React Query
owns it.

## Environment variables

Copy `.env.example` to `.env.local` and set the backend URL:

```
VITE_API_URL=http://localhost:3000/api
```

`.env.local` is gitignored. Update this value once the real backend URL is
available.

## Auth flow (implemented, backend endpoints pending)

- `src/store/authStore.ts` holds `user`, `accessToken`, `refreshToken`,
  persisted via `zustand/middleware persist`.
- `src/api/client.ts` is the shared axios instance:
  - request interceptor attaches `Authorization: Bearer <accessToken>`
  - response interceptor catches a 401, calls `POST /auth/refresh`, retries
    the original request once, and logs the user out if the refresh fails
- `src/routes/ProtectedRoute.tsx` redirects to `/login` when not
  authenticated; wraps the dashboard route in `App.tsx`.
- `src/pages/LoginPage.tsx` / `RegisterPage.tsx` call `src/api/auth.ts`
  (`login`, `register`, `logout`) via `useMutation`, matching the backend's
  planned `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`,
  `POST /auth/logout` endpoints from Phase 0.

These pages/hooks are wired against the expected API shape but have not
been tested against a live backend yet - double-check field names and
response shape once the real backend URLs are provided.

## Scripts

```
npm run dev       start the Vite dev server (http://localhost:5173)
npm run build     type-check (tsc -b) then production build
npm run preview   preview the production build locally
npm run lint      run oxlint
```

## Adding more shadcn/ui components

```
npx shadcn@latest add <component-name>
```

This writes directly into `src/components/ui/`. Config is in
`components.json` (path aliases, Tailwind settings).
