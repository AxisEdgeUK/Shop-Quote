# SHOP Quote

A full-stack CNC shop quoting MVP for small machine shops — create, calculate, and deliver professional PDF-ready quotes with an accurate cost engine.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/shop-quote run dev` — run the frontend (port 20335)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + TailwindCSS v4 + shadcn/ui + Wouter routing + TanStack Query
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI source of truth (do NOT change `info.title: Api`)
- `lib/db/src/schema/` — Drizzle schema files (`settings.ts`, `customers.ts`, `machines.ts`, `quotes.ts`)
- `lib/api-client-react/src/generated/` — generated hooks and Zod schemas (don't edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/shop-quote/src/pages/` — React pages (dashboard, quotes, customers, machines, settings, landing, pricing)
- `artifacts/shop-quote/src/components/quotes/` — QuoteWizard (5-step), PrintLayout
- `artifacts/shop-quote/src/components/layout/` — AppLayout, Sidebar

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → React Query hooks. Never write hooks manually.
- **Flat Wouter routing**: All routes declared in a flat `<Switch>` in `App.tsx`. Do NOT use `/:rest*` with inline children — this breaks nested Switch path matching in Wouter v3.
- **Margin not markup**: Cost engine uses `sell_price = cost / (1 - margin%)`. Correct formula validated.
- **Numeric DB fields**: PostgreSQL `numeric` type returns strings in JS — always `parseFloat()` in route handlers before responding.
- **Error boundary**: Root-level `ErrorBoundary` in `App.tsx` wraps the entire app. AppLayout also has one for page-level isolation.

## Product

- **Dashboard**: Live stats — total quotes, win rate, total quoted value, follow-up needed
- **Quotes**: Full 5-step wizard (Customer → Part Details → Assumptions → Review → Complete), list view with actions, detail/print view (PDF-ready), edit existing quotes
- **Customers**: CRUD — list, create, edit, delete
- **Machines**: CRUD — list, create, edit, delete with hourly/setup rates and active toggle
- **Settings**: Company details, quoting defaults (hourly rate, setup rate, margin %, VAT, quote validity)
- **Landing & Pricing**: Public-facing pages

## Gotchas

- After changing the OpenAPI spec, always run codegen: `pnpm --filter @workspace/api-spec run codegen`
- After DB schema changes, run: `pnpm --filter @workspace/db run push`
- Do NOT put `<style dangerouslySetInnerHTML>` inside React components — it injects document-global styles that break print media and SSR tooling
- Wouter v3 `/:rest*` with inline children breaks nested Switch routing — keep routing flat
- The API server base path is `/api` — all routes must be prefixed
- `calcLineItem` applies discount AFTER margin: `sellPrice = (costBeforeMargin / (1 - margin)) * (1 - discount%)`. The wizard preview and the server-side stored value both use this formula — keep them in sync if you change one.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
