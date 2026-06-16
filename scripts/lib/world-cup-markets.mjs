import { retry } from "./retry.mjs";
import { matches } from "../../src/data/fixtures.ts";

export function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePrices(value) {
  const [yes, no] = parseJsonArray(value);
  return { yes: Number(yes), no: Number(no) };
}

export function parseTokenIds(value) {
  return parseJsonArray(value).map(String);
}

export async function fetchWorldCupMarkets(config) {
  const rows = [];
  const maxFixtures = Number(config.snapshot?.maxFixturesPerRun || 4);

  for (const fixture of matches) {
    const event = await fetchFixtureEvent(fixture);
    if (!event || event.closed) continue;

    const eventRows = [];
    for (const market of event.markets || []) {
      if (!market.active || market.closed || !market.acceptingOrders) continue;
      if (!isWinDrawLossMarket(event, market)) continue;
      const row = toMarketRow(event, market, fixture);
      if (!row.yesTokenId || !Number.isFinite(row.yes) || row.yes <= 0 || row.yes >= 1) continue;
      eventRows.push({
        ...row,
        fixtureId: fixture.id,
        matchLabel: `${fixture.home} vs ${fixture.away}`,
      });
    }

    if (eventRows.length === 0) continue;
    rows.push(...eventRows);
    if (new Set(rows.map((row) => row.eventSlug)).size >= maxFixtures) break;
  }

  return rows.sort((a, b) => b.volume24hr - a.volume24hr || b.liquidity - a.liquidity);
}

function isWinDrawLossMarket(event, market) {
  if (!/^fifwc-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/.test(event.slug || "")) return false;
  if (!String(market.slug || "").startsWith(`${event.slug}-`)) return false;
  const question = String(market.question || "");
  return (
    /^Will .+ win on \d{4}-\d{2}-\d{2}\?$/.test(question) ||
    /^Will .+ vs\. .+ end in a draw\?$/.test(question)
  );
}

async function fetchFixtureEvent(fixture) {
  for (const slug of fixtureSlugCandidates(fixture)) {
    const event = await retry(`fetch ${slug}`, async () => {
      const response = await fetch(`https://gamma-api.polymarket.com/events/slug/${slug}`);
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Gamma API failed: HTTP ${response.status}`);
      return response.json();
    });
    if (event) return event;
  }
  return undefined;
}

function fixtureSlugCandidates(fixture) {
  const base = fixture.id.replace(/-1$/, "");
  const date = fixtureDate(fixture.date);
  return [
    `fifwc-${base}-${formatDate(addDays(date, -1))}`,
    `fifwc-${base}-${formatDate(date)}`,
    `fifwc-${base}-${formatDate(addDays(date, 1))}`,
  ];
}

function fixtureDate(value) {
  const match = value.match(/\w+,\s+(\w+)\s+(\d+)/);
  if (!match) throw new Error(`Invalid fixture date=${value}`);
  const [, month, day] = match;
  const months = new Map([
    ["Jan", 0],
    ["Feb", 1],
    ["Mar", 2],
    ["Apr", 3],
    ["May", 4],
    ["Jun", 5],
    ["Jul", 6],
  ]);
  if (!months.has(month)) throw new Error(`Invalid fixture month=${month}`);
  return new Date(Date.UTC(2026, months.get(month), Number(day)));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function toMarketRow(event, market, fixture) {
  const { yes, no } = parsePrices(market.outcomePrices);
  const [yesTokenId, noTokenId] = parseTokenIds(market.clobTokenIds);
  const bid = Number(market.bestBid || 0);
  const ask = Number(market.bestAsk || 0);
  const tickSize = String(market.orderPriceMinTickSize || market.tickSize || "0.01");

  return {
    event: event.title?.trim(),
    eventSlug: event.slug,
    question: market.question,
    outcomeKey: matchOutcomeKey(market.question, fixture),
    marketSlug: market.slug,
    conditionId: market.conditionId,
    acceptingOrders: Boolean(market.acceptingOrders),
    negRisk: Boolean(market.negRisk),
    tickSize,
    minSize: Number(market.orderMinSize || 5),
    yesTokenId,
    noTokenId,
    yes,
    no,
    bid,
    ask,
    spread: ask && bid ? ask - bid : Number.POSITIVE_INFINITY,
    volume24hr: Number(market.volume24hr || 0),
    liquidity: Number(market.liquidity || 0),
    oneDayChange: Number(market.oneDayPriceChange || 0),
    oneWeekChange: Number(market.oneWeekPriceChange || 0),
    lastTradePrice: Number(market.lastTradePrice || 0),
  };
}

function matchOutcomeKey(question, fixture) {
  const text = String(question || "");
  if (/ end in a draw\?$/.test(text)) return "draw";
  if (text === `Will ${fixture.home} win on ${eventDateFromQuestion(text)}?`) return "home";
  if (text === `Will ${fixture.away} win on ${eventDateFromQuestion(text)}?`) return "away";
  if (text.includes(`Will ${fixture.home} win on `)) return "home";
  if (text.includes(`Will ${fixture.away} win on `)) return "away";
  return null;
}

function eventDateFromQuestion(question) {
  return String(question || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
}
