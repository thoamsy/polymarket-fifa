# Polymarket FIFA Agent Rules

This project automates Polymarket main-site CLOB workflows for 2026 FIFA World Cup markets. The current scope is group-stage markets only. Do not add knockout, overtime, or penalty-shootout logic unless the user changes the scope.

## Strategy Source

Read `STRATEGY.md` before any analysis, sizing, or trading decision. `AGENTS.md` defines hard operating rules. `STRATEGY.md` defines bankroll strategy, Bayesian updates, market selection, and sizing. If the two files appear to conflict, obey the stricter execution-safety rule and then follow `STRATEGY.md` for strategy details.

## Division of Labor

Code only fetches data, validates hard rules, and places/cancels orders. The LLM makes
every trading judgment (which team, price cap, size, thesis) and expresses it as a plan
JSON. Do not add team-strength scoring, automatic candidate selection, or dynamic
sizing models back into the code.

## Execution Boundary

- The code is built around four commands: `pnpm poly:verify` (account state),
  `pnpm poly:snapshot` (fetch the matchday W/D/L markets + live prices), `pnpm
  poly:execute-plan` (validate + place an LLM-authored plan), and `pnpm poly:watch-fills`
  (monitor fills and cancel anything unfilled past the timeout).
- Two-key live gate: real orders require BOTH `config.execution.dryRun=false` AND
  `POLY_EXECUTE=1`. A leftover `POLY_EXECUTE=1` alone stays in dry-run because the config
  defaults to `dryRun=true`. Never persist `POLY_EXECUTE=1` in `.env`; pass it per run.
- Use the guarded execution path: `pnpm poly:execute-plan`. Do not bypass it with ad hoc
  order-posting scripts.
- The validator (`scripts/lib/plan-validation.mjs`) enforces: W/D/L single-match markets
  only, `limitPrice <= maxPrice`, per-order notional <= `maxBetUsdc`, run total <=
  `maxRunNotionalUsdc`, one order per match, price inside `[priceMin, priceMax]`.
- Prefer maker, post-only limit orders. For same-day matchday trades that must fill
  before kickoff, a taker-style limit at or below the approved cap is acceptable; set
  `postOnly:false` on that order and keep it inside the stake and price cap.
- Treat `runs/latest-plan.json` as perishable. Do not execute stale plans
  (`planMaxAgeSeconds`).

## Bankroll Objective

The objective is to maximize expected return while preserving enough capital for later group-stage opportunities. Use the dynamic bankroll and Bayesian sizing framework in `STRATEGY.md`; do not rely on a fixed percentage rule alone.

## Market Selection

Use the market-selection rules in `STRATEGY.md`. Always account for liquidity, spread, kickoff timing, lineup/news uncertainty, remaining schedule, and correlation between positions.

## Review And Learning Loop

Record every plan, order, and resolved outcome. For each planned or executed bet, keep:

- Timestamp, strategy profile, bankroll, reserve, and risk limits.
- Market label using country names plus emoji flags, side, limit price, size, notional, and order status.
- Pre-bet thesis and signal reasons.
- Closing result, realized P/L, and whether the prediction was directionally right.
- Error category when wrong: bad team strength estimate, stale news, lineup/injury miss, market already priced the signal, group incentive/tiebreaker miss, or random variance.

After match results arrive, compare predictions against outcomes before the next execution run. Track whether the tournament pattern favors favorites, underdogs, host-region teams, defensive teams, or volatile groups. Use that review to adjust filters and sizing, not to justify chasing losses.

For each same-day matchday run, write or update a Markdown trade log under `records/`. Use readable match labels such as `🇳🇱 Netherlands vs 🇯🇵 Japan`. Include the order ID, whether the order matched or remains open, and the exact buy thesis. After settlement, fill in the official 90-minute result, realized P/L, and review notes before the next execution run.

## Daily Operating Flow

1. Run `pnpm poly:verify` if credentials, balances, or open orders may have changed.
2. Read `STRATEGY.md` and update settled records before sizing new trades.
3. Run `pnpm poly:snapshot` to fetch the matchday W/D/L markets and live prices.
4. Author `runs/latest-plan.json` from the snapshot: pick the markets, the limit price
   (<= the approved cap), the size, and a thesis for each. One order per match.
5. Run `pnpm poly:execute-plan` (dry-run first; it validates the plan). Go live only with
   the two-key gate: `config.execution.dryRun=false` AND `POLY_EXECUTE=1`.
6. Run `pnpm poly:watch-fills` to monitor fills and auto-cancel anything unfilled past
   `unfilledCancelSeconds`.
7. After results, update the review log before increasing risk.
