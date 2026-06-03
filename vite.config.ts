import { Buffer } from "node:buffer";
import { inflateSync } from "node:zlib";
import type { Connect } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const POLYMARKET_WORLD_CUP_URL = "https://polymarket.com/sports/world-cup/games";

type PolymarketMarket = {
  slug?: string;
  groupItemTitle?: string;
  outcomePrices?: string[];
  lastTradePrice?: number;
  volumeNum?: number;
  volume?: string;
};

type PolymarketEvent = {
  title?: string;
  volume?: number;
  volumeNum?: number;
  updatedAt?: string;
  markets?: PolymarketMarket[];
};

type PolymarketGame = {
  date?: string;
  time?: string;
  timestamp?: string;
};

type PolymarketTeam = {
  name?: string;
};

type PolymarketState = {
  games?: Record<string, PolymarketGame>;
  teams?: Record<string, { home?: PolymarketTeam; away?: PolymarketTeam }>;
  events?: Record<string, PolymarketEvent>;
  marketsSections?: Record<string, { moneyline?: { markets?: string[] } }>;
};

function decodeInitialState(encoded: string) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (encoded.length % 4)) % 4);
  return JSON.parse(inflateSync(Buffer.from(base64, "base64")).toString("utf8")) as PolymarketState;
}

function readNextData(html: string) {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error("Polymarket page did not include __NEXT_DATA__.");
  }

  return JSON.parse(match[1]) as {
    props?: {
      pageProps?: {
        initialState?: string;
      };
    };
  };
}

function probabilityFromMarket(market?: PolymarketMarket) {
  const price = Number(market?.outcomePrices?.[0] ?? market?.lastTradePrice);
  return Number.isFinite(price) ? Math.round(price * 1000) / 10 : 0;
}

function normalizeWorldCupState(state: PolymarketState) {
  const games = state.games ?? {};

  return Object.keys(games).flatMap((slug) => {
    const game = games[slug];
    const teams = state.teams?.[slug];
    const event = state.events?.[slug];
    const moneylineSlugs = state.marketsSections?.[slug]?.moneyline?.markets ?? [];
    const markets = moneylineSlugs.map((marketSlug) => event?.markets?.find((market) => market.slug === marketSlug));
    const home = teams?.home?.name;
    const away = teams?.away?.name;

    if (!home || !away || markets.length < 3) {
      return [];
    }

    return {
      id: slug,
      date: game.date ?? "",
      time: game.time ?? "",
      home,
      away,
      homeWin: probabilityFromMarket(markets[0]),
      draw: probabilityFromMarket(markets[1]),
      awayWin: probabilityFromMarket(markets[2]),
      volume: Math.round(Number(event?.volume ?? event?.volumeNum ?? 0)),
      timestamp: game.timestamp,
      marketSlugs: moneylineSlugs,
      polymarketUrl: `https://polymarket.com/event/${slug}`,
    };
  });
}

async function loadWorldCupMatches() {
  const response = await fetch(POLYMARKET_WORLD_CUP_URL);
  if (!response.ok) {
    throw new Error(`Polymarket returned ${response.status}.`);
  }

  const nextData = readNextData(await response.text());
  const initialState = nextData.props?.pageProps?.initialState;
  if (!initialState) {
    throw new Error("Polymarket page did not include initialState.");
  }

  const state = decodeInitialState(initialState);
  const matches = normalizeWorldCupState(state);

  if (matches.length === 0) {
    throw new Error("No World Cup moneyline markets were found.");
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: "polymarket-page",
    matches,
  };
}

function worldCupApiMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (!req.url?.startsWith("/api/world-cup/matches")) {
      next();
      return;
    }

    try {
      const payload = await loadWorldCupMatches();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown Polymarket fetch error." }));
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "world-cup-polymarket-api",
      configureServer(server) {
        server.middlewares.use(worldCupApiMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use(worldCupApiMiddleware());
      },
    },
  ],
});
