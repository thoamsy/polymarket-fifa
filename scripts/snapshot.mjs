import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadStrategyConfig } from "./lib/strategy-config.mjs";
import { fetchWorldCupMarkets } from "./lib/world-cup-markets.mjs";

// Pure data: list every group-stage W/D/L market for the upcoming matchday with live
// prices. No scoring, no judgment, no order selection. The LLM reads this snapshot and
// authors the plan (which team, price cap, size, thesis).

const config = await loadStrategyConfig();
const generatedAt = new Date().toISOString();
const markets = await fetchWorldCupMarkets(config);

const fixtures = groupByFixture(markets);
const snapshot = {
  schemaVersion: 1,
  kind: "world-cup-matchday-snapshot",
  generatedAt,
  tagSlug: config.tagSlug,
  limits: config.limits,
  fixtureCount: fixtures.length,
  marketCount: markets.length,
  fixtures,
};

const snapshotDate = generatedAt.slice(0, 10);
const outputPath = path.resolve("runs", `snapshot-${snapshotDate}.json`);
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
// Also keep a stable latest pointer for convenience.
await writeFile(path.resolve("runs", "latest-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);

console.log(`World Cup matchday snapshot: ${generatedAt}`);
console.log(`snapshot_path=${outputPath}`);
console.log(`fixtures=${fixtures.length} markets=${markets.length}`);
console.log(`limits: maxBet=${config.limits.maxBetUsdc} maxRunNotional=${config.limits.maxRunNotionalUsdc} maxOrders=${config.limits.maxOrdersPerRun} price=[${config.limits.priceMin},${config.limits.priceMax}]`);
console.log("");

for (const fixture of fixtures) {
  console.log(`${fixture.matchLabel}  (${fixture.eventSlug})`);
  for (const market of fixture.markets) {
    console.log(
      `  [${market.outcomeKey}] ${market.question}\n` +
        `      yes=${market.yes} bid=${market.bid || "n/a"} ask=${market.ask || "n/a"} ` +
        `spread=${fmt(market.spread)} vol24=${market.volume24hr} liq=${market.liquidity} ` +
        `tick=${market.tickSize} minSize=${market.minSize}`,
    );
  }
}

console.log("");
console.log("Next: LLM authors runs/latest-plan.json from this snapshot, then `pnpm poly:execute-plan`.");

function groupByFixture(rows) {
  const byEvent = new Map();
  for (const row of rows) {
    if (!byEvent.has(row.eventSlug)) {
      byEvent.set(row.eventSlug, {
        matchLabel: row.matchLabel,
        eventSlug: row.eventSlug,
        event: row.event,
        markets: [],
      });
    }
    byEvent.get(row.eventSlug).markets.push(toSnapshotMarket(row));
  }
  return [...byEvent.values()];
}

function toSnapshotMarket(row) {
  return {
    outcomeKey: row.outcomeKey,
    question: row.question,
    marketSlug: row.marketSlug,
    conditionId: row.conditionId,
    tokenId: row.yesTokenId,
    tickSize: row.tickSize,
    minSize: row.minSize,
    negRisk: row.negRisk,
    acceptingOrders: row.acceptingOrders,
    yes: row.yes,
    bid: row.bid,
    ask: row.ask,
    spread: Number.isFinite(row.spread) ? round(row.spread) : null,
    volume24hr: round(row.volume24hr),
    liquidity: round(row.liquidity),
    oneDayChange: row.oneDayChange,
    oneWeekChange: row.oneWeekChange,
    lastTradePrice: row.lastTradePrice,
  };
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function fmt(value) {
  return Number.isFinite(value) ? round(value) : "n/a";
}
