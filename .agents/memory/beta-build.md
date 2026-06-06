---
name: Beta v0.1 build decisions
description: Decisions made during the final pre-testing build that must stay consistent.
---

## Pricing
Pricing deliberately removed from all public pages (landing + /pricing). No prices should appear anywhere. Replace any pricing section with "Beta Testing — Pricing announced at general launch." Do not add prices back without explicit instruction.

**Why:** Owner is still deciding launch price (considering £999 lifetime vs £120/month). Showing old £499/£50 prices is out of date and hurts positioning.

## Internal-only API routes (direct fetch)
Feature Requests (`/api/feature-requests`) and Feedback (`/api/feedback`) use direct `fetch()` in the frontend and are NOT in the OpenAPI spec. This is intentional per replit.md convention: "small internal-only features may use direct fetch if they don't belong in the public API spec."

**How to apply:** New internal beta tools follow this pattern. Customer-facing quote/customer/machine data goes through the OpenAPI spec → codegen pipeline.

## Customer History
Customer view computes all stats locally from `useListQuotes()` filtered by customerId — no separate API endpoint needed. Stats: total, won, lost, win rate, total value, won value, avg quote value, last quote date/number/status.

**Why:** All quotes are already fetched for the dashboard. Re-fetching per customer would be an unnecessary extra request.

## Advanced Options in wizard
Step 3 of the full quote wizard has a `showAdvanced` toggle (default: hidden) that reveals: Revision + Revision Notes fields, Internal Notes field, Certification Requirements card. Price Breaks card is always visible. This reduces visual clutter without removing functionality.

## DB schema pattern
`feature_requests` table lives in `lib/db/src/schema/feature-requests.ts` and is exported from `lib/db/src/schema/index.ts`. After adding a new schema file: always run `pnpm run typecheck:libs` to rebuild declarations before the API server can import from `@workspace/db`.
