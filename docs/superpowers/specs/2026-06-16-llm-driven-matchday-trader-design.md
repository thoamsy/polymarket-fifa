# LLM-Driven Matchday Trader — Redesign

Date: 2026-06-16

## Problem

The trading scripts accreted strategy "thinking" that should belong to the LLM, not
the code: a market scoring model (`scoreCandidate`), score-based auto-selection of
orders, dynamic Kelly sizing with drawdown throttles (`resolveEffectiveProfile`,
`drawdownThrottle`, `highWaterMark`). The user's strategy is that the **LLM** decides
which team to back; the **code** only fetches data, validates hard rules, and places /
cancels orders. Records also show group-winner orders ("Will Ivory Coast win Group E?")
were posted live — a direct violation of the W/D/L-only rule.

## Principle

**Code = data + validation + execution. LLM = all judgment, expressed as a plan JSON.**

## Data Flow

```
pnpm poly:verify        account state (kept as-is)
pnpm poly:snapshot      fetch next matchday's W/D/L markets + live prices
   -> runs/snapshot-<date>.json   (LLM reads this)
LLM authors runs/latest-plan.json (picks, price cap, size, thesis)
pnpm poly:execute-plan  validate + place orders (dry-run default)
pnpm poly:watch-fills    poll fills, cancel unfilled after timeout
```

## Components

### poly:snapshot (`scripts/snapshot.mjs`, replaces `run-strategy.mjs`)
Pure data. Lists every group-stage W/D/L market for the target matchday with:
`matchLabel, eventSlug, marketSlug, question, outcomeKey (home/away/draw), tokenId,
tickSize, minSize, negRisk, yes, bid, ask, spread, volume24hr, liquidity`.
Mechanical health checks only (accepting orders; 0 < price < 1). **No scoring, no
judgment filtering.** Output `runs/snapshot-<date>.json`.

### Plan JSON (LLM-authored interface contract, schemaVersion 2)
```json
{
  "schemaVersion": 2,
  "generatedAt": "<ISO>",
  "strategy": "world-cup-2026-matchday-moneyline",
  "snapshotPath": "runs/snapshot-2026-06-17.json",
  "orders": [
    {
      "eventSlug": "fifwc-...-2026-06-17",
      "marketSlug": "...",
      "question": "Will X win on 2026-06-17?",
      "outcome": "YES",
      "side": "BUY",
      "tokenId": "...",
      "tickSize": "0.01",
      "minSize": 5,
      "negRisk": false,
      "maxPrice": 0.55,
      "limitPrice": 0.54,
      "size": 4,
      "postOnly": false,
      "orderType": "GTC",
      "thesis": "..."
    }
  ]
}
```
All structural fields are copied from the snapshot. The LLM only chooses which markets,
the price, the size, and the thesis.

### poly:execute-plan (`scripts/execute-strategy-plan.mjs`, refactor)
Validation = the safety rails to KEEP (these are mechanical, not judgment):
- W/D/L single-match markets only (question regex + `fifwc-` eventSlug prefix) — blocks
  group-winner / advance / knockout markets.
- `limitPrice <= maxPrice` (no price chasing).
- per-order notional <= `limits.maxBetUsdc` ($2 this run).
- run total notional <= `limits.maxRunNotionalUsdc` ($30 this run).
- at most one order per `eventSlug` (one view per match).
- dry-run by default; real orders require `POLY_EXECUTE=1` AND a fresh, profile-matched
  plan (staleness check).
Then places orders via `createAndPostOrder`, writing an execution log with order IDs.

### poly:watch-fills (`scripts/watch-fills.mjs`, new)
Reads the latest execution log, polls `getOrder` / `size_matched` every
`pollIntervalSeconds` (~15s), and cancels any order still unfilled after
`unfilledCancelSeconds` (300s = 5 min) via `cancelOrder`. Records the outcome.

### config (`config/world-cup-group-strategy.json`, big slim-down)
Remove `profiles`, `dynamicSizing`, `drawdownThrottle`, `highWaterMark`, `minScore`,
and all scoring-oriented filters. Keep:
```json
{
  "tagSlug": "2026-fifa-world-cup",
  "snapshot": { "maxFixturesPerRun": 4 },
  "limits": { "maxOrdersPerRun": 4, "maxBetUsdc": 2, "maxRunNotionalUsdc": 30,
              "priceMin": 0.1, "priceMax": 0.82 },
  "execution": { "dryRun": true, "orderType": "GTC", "postOnly": false,
                 "planMaxAgeSeconds": 600, "unfilledCancelSeconds": 300,
                 "pollIntervalSeconds": 15, "outputPath": "runs/latest-plan.json" }
}
```

## File changes
- DELETE `scripts/lib/group-stage-strategy.mjs` (scoring / auto-select / dynamic Kelly).
- REPLACE `scripts/run-strategy.mjs` -> `scripts/snapshot.mjs`.
- REFACTOR `scripts/execute-strategy-plan.mjs` (new plan schema + hard caps),
  `scripts/lib/strategy-config.mjs` (new config shape).
- NEW `scripts/watch-fills.mjs`, `scripts/lib/plan-validation.mjs`.
- KEEP `poly-common.mjs`, `retry.mjs`, `account-state.mjs`, `world-cup-markets.mjs`,
  `verify-clob.mjs` (data fetch / order infra — no judgment).

## This run's sequence (supervised; no cron)
1. Refactor code.
2. dry-run: `poly:snapshot` then `poly:execute-plan` (dry) succeed.
3. Verify live account state — confirm no leftover group-winner / non-W/D/L positions.
4. After user OK: `POLY_EXECUTE=1` place $2 orders (taker-style capped limit so they
   fill), total <= $30.
5. `poly:watch-fills` monitors; cancels anything unfilled after 5 min.

## Out of scope (future)
Cron / unattended auto-execution. Build the pieces so it is *possible*, but keep this
run human-supervised.
