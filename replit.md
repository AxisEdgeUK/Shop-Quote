# SHOP Quote

A full-stack CNC shop quoting MVP for small machine shops — create, calculate, and deliver professional PDF-ready quotes with an accurate cost engine. Currently in **Beta v0.1** for controlled real-world testing.

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
- `lib/db/src/schema/` — Drizzle schema files (`settings.ts`, `customers.ts`, `machines.ts`, `quotes.ts`, `feedback.ts`)
- `lib/api-client-react/src/generated/` — generated hooks and Zod schemas (don't edit manually)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/shop-quote/src/pages/` — React pages (dashboard, quotes, customers, machines, settings, landing, pricing)
- `artifacts/shop-quote/src/components/quotes/` — QuoteWorkspace, QuoteBuilder, EstimatorNotes, DrawingViewer, PrintLayout
- `artifacts/shop-quote/src/components/layout/` — AppLayout, Sidebar

## Estimating Workspace (drawing-first, single flow)

- There is ONE quote create flow ("New Quote") — no Quick/Full split. Create and Edit share the same `QuoteWorkspace` + `QuoteBuilder`.
- `QuoteWorkspace` wraps the New/Edit quote pages — dark header bar + draggable split pane. LEFT "Job File" (~67%, default `splitPct=67`, clamp 45..75) = `DrawingViewer` (flex-1) + `EstimatorNotes` below; RIGHT (~33%) = `QuoteBuilder`.
- Desktop layout: `-mx-8 -mb-8` breaks out of AppLayout's horizontal/bottom padding; header is `height: 44px`; split pane uses `calc(100vh - 44px)`. Do NOT use `-mt-8` — AppLayout has `md:pt-0` (no top padding on desktop).
- Mobile layout: `-mx-4 -mt-4 -mb-4` + `height: calc(100svh - 3.5rem)` (accounts for 56px mobile top bar); **stacked** (drawing ~55svh, then notes, then builder) — NOT a tab switcher.
- `QuoteBuilder` — right-panel quote editor (extracted from the old Quick Quote; reuses PartCard/SummaryPanel/AddonsSection/calc verbatim). Props: `quoteId?`, `initialQuote?`, `onQuoteCreated?`. Auto-creates a Draft once a customer is selected (`customerId>0`), then debounced (800ms) auto-saves. Single-column layout; actions = View Quote + Generate PDF.
  - **Auto-save safety**: the PATCH sends ONLY `customerId/leadTime/deliveryMethod/deliveryCost/includeDeliveryInTotal` (+`lineItems` when parts are valid). NEVER `status`/dates/`notes`/`internalNotes` — sending those would clobber or drift the quote. `lastSavedRef` starts null and the first settled render (after hydrate/create) just establishes the baseline without saving; in the edit flow the baseline waits for `hydrated` so opening a quote never triggers a write.
  - **Advanced-field round-trip**: the edit UI drops advanced per-line fields, but each hydrated part keeps an `_original` line-item snapshot so saving back preserves data not shown in the simplified UI. Note `QuoteLineItem` responses do NOT echo `notes`, so part notes hydrate to "".
- `EstimatorNotes` — internal-only textarea (not on PDF), debounced PATCH of `internalNotes`; holds edits until a `quoteId` exists, then flushes.
- `DrawingViewer` — dark engineering viewer (PDF via native browser `<iframe>`, images with CSS transform zoom+pan). Files are **uploaded to object storage** and persisted to the `quote_drawings` table (linked to a quote by `quoteId`). When the quote's `quoteId` first appears, a guarded effect flushes any in-memory (not-yet-saved) file. Supports drag-to-upload, wheel zoom, touch pinch-zoom.

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → React Query hooks. Never write hooks manually. Exception: small internal-only features (e.g. beta feedback submission) may use direct fetch if they don't belong in the public API spec.
- **Flat Wouter routing**: All routes declared in a flat `<Switch>` in `App.tsx`. Do NOT use `/:rest*` with inline children — this breaks nested Switch path matching in Wouter v3.
- **Margin not markup**: Cost engine uses `sell_price = cost / (1 - margin%)`. Correct formula validated.
- **Numeric DB fields**: PostgreSQL `numeric` type returns strings in JS — always `parseFloat()` in route handlers before responding.
- **Error boundary**: Root-level `ErrorBoundary` in `App.tsx` wraps the entire app. AppLayout also has one for page-level isolation.

## Product

- **Dashboard**: Live stats — total quotes, win rate, total quoted value, follow-up needed
- **Quotes**: Single drawing-first Estimator's Workspace for create/edit (auto-create Draft on customer-select, auto-save), list view with actions, detail/print view (PDF-ready)
- **Customers**: CRUD — list, create, edit, delete
- **Machines**: CRUD — list, create, edit, delete with hourly/setup rates and active toggle
- **Settings**: Company details, quoting defaults (hourly rate, setup rate, margin %, VAT, quote validity), beta demo-reset
- **Landing & Pricing**: Public-facing pages

## Beta Features (v0.1)

- **Beta banner**: Shown at the top of every page in the app (hidden on print) — "Beta version — for workflow testing only."
- **Version label**: "Beta v0.1" badge in the sidebar footer
- **Send feedback**: Button in the sidebar footer opens a 7-question form. Responses stored in the `feedback` DB table. API: `GET/POST /api/feedback`.
- **Reset demo data**: Button at the bottom of the Settings page. Wipes all quotes, customers, and machines then seeds clean demo records (3 machines, 1 customer). API: `POST /api/settings/demo-reset`.
- **Print safety checklist**: Before `window.print()` is called on the View Quote or Presentation pages, a dialog prompts the user to tick off 5 items (material, quantity, tolerances, lead time, margin). PDF only generates once all are ticked.
- **Drawing Scan Assist**: Hidden from UI in Beta v0.1. Backend route `/api/ai/scan-drawing` (GPT-4o vision) is preserved in code but the scan button is not shown to users. Re-enable by restoring the button in `drawing-viewer.tsx` and `ScanAssistPanel` render in `quote-wizard.tsx`.

## Gotchas

- After changing the OpenAPI spec, always run codegen: `pnpm --filter @workspace/api-spec run codegen`
- After DB schema changes, run: `pnpm --filter @workspace/db run push`
- Do NOT put `<style dangerouslySetInnerHTML>` inside React components — it injects document-global styles that break print media and SSR tooling
- Wouter v3 `/:rest*` with inline children breaks nested Switch routing — keep routing flat
- The API server base path is `/api` — all routes must be prefixed
- `calcLineItem` applies discount AFTER margin: `sellPrice = (costBeforeMargin / (1 - margin)) * (1 - discount%)`. The wizard preview and the server-side stored value both use this formula — keep them in sync if you change one.
- Drawing files are persisted via object storage — `drawing.file` is only set for newly-uploaded (not-yet-saved) files; `drawing.url` is always set (blob URL for new, object storage URL for persisted).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
