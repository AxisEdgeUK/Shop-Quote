---
name: Line item rate source
description: How manual vs machine rate is modeled on quote line items
---

Quote line items carry a `rateSource` ("machine" default, or "manual"). When manual,
the user enters an hourly rate (and optional setup rate); `machineId` is forced to
null on the server so the internal view can clearly show a manual rate was used.

**Why:** Manual rate lets shops quote without a configured machine. Reusing the
existing `machineHourlyRate`/`machineSetupRate` snapshot columns keeps `calcLineItem`
unchanged — only the rate *source* differs.

**How to apply:**
- Setup rate falls back to the hourly rate when blank/zero (manual mode).
- Any logic keyed off `machineId` (e.g. the "no machine assigned" warning in
  view.tsx, or machine grouping) must skip items where `rateSource === "manual"`,
  otherwise legitimate manual items get falsely flagged.
- Validation: manual with missing/<=0 hourly is blocked client-side (canSubmit)
  and server-side (400 "Hourly rate required for manual rate quote.").
