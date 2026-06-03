import { matches, type Match } from "../data/fixtures";

export type BoardSource = "polymarket-page" | "static-fallback";

export type WorldCupBoardData = {
  fetchedAt: string;
  source: BoardSource;
  matches: Match[];
};

export const WORLD_CUP_QUERY_KEY = ["polymarket", "world-cup", "group-stage"] as const;

export const staticWorldCupBoardData: WorldCupBoardData = {
  fetchedAt: "2026-06-03T00:00:00.000Z",
  source: "static-fallback",
  matches,
};

function assertMatch(value: unknown): value is Match {
  if (!value || typeof value !== "object") return false;
  const match = value as Partial<Match>;

  return (
    typeof match.id === "string" &&
    typeof match.date === "string" &&
    typeof match.time === "string" &&
    typeof match.home === "string" &&
    typeof match.away === "string" &&
    typeof match.homeWin === "number" &&
    typeof match.draw === "number" &&
    typeof match.awayWin === "number" &&
    typeof match.volume === "number"
  );
}

function assertBoardData(value: unknown): asserts value is WorldCupBoardData {
  if (!value || typeof value !== "object") {
    throw new Error("World Cup API returned a non-object payload.");
  }

  const payload = value as Partial<WorldCupBoardData>;
  if (typeof payload.fetchedAt !== "string" || !Array.isArray(payload.matches) || !payload.matches.every(assertMatch)) {
    throw new Error("World Cup API returned an invalid match payload.");
  }
}

export async function fetchWorldCupBoard(): Promise<WorldCupBoardData> {
  const response = await fetch("/api/world-cup/matches", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => undefined);
    const message = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : `HTTP ${response.status}`;
    throw new Error(`Could not refresh Polymarket board: ${message}`);
  }

  const payload: unknown = await response.json();
  assertBoardData(payload);

  return {
    ...payload,
    source: payload.source === "polymarket-page" ? "polymarket-page" : "static-fallback",
  };
}
