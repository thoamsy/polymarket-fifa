import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_CONFIG_PATH = "config/world-cup-group-strategy.json";

export async function loadStrategyConfig(configPath = process.env.STRATEGY_CONFIG || DEFAULT_CONFIG_PATH) {
  const absolutePath = path.resolve(configPath);
  const raw = await readFile(absolutePath, "utf8");
  const base = JSON.parse(raw);

  const limits = {
    maxOrdersPerRun: envInteger("MAX_ORDERS_PER_RUN", base.limits?.maxOrdersPerRun ?? 4),
    maxBetUsdc: envNumber("MAX_BET_USDC", base.limits?.maxBetUsdc ?? 2),
    maxRunNotionalUsdc: envNumber("MAX_RUN_NOTIONAL_USDC", base.limits?.maxRunNotionalUsdc ?? 30),
    priceMin: Number(base.limits?.priceMin ?? 0.1),
    priceMax: Number(base.limits?.priceMax ?? 0.82),
  };

  const execution = {
    dryRun: base.execution?.dryRun !== false,
    orderType: base.execution?.orderType || "GTC",
    postOnly: Boolean(base.execution?.postOnly),
    planMaxAgeSeconds: envInteger("PLAN_MAX_AGE_SECONDS", base.execution?.planMaxAgeSeconds ?? 600),
    unfilledCancelSeconds: envInteger("UNFILLED_CANCEL_SECONDS", base.execution?.unfilledCancelSeconds ?? 300),
    pollIntervalSeconds: envInteger("POLL_INTERVAL_SECONDS", base.execution?.pollIntervalSeconds ?? 15),
    outputPath: process.env.STRATEGY_PLAN_PATH || base.execution?.outputPath || "runs/latest-plan.json",
  };

  return {
    configPath: absolutePath,
    tagSlug: base.tagSlug,
    snapshot: { maxFixturesPerRun: Number(base.snapshot?.maxFixturesPerRun || 4) },
    limits,
    execution,
  };
}

function envNumber(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`Invalid ${name}=${value}`);
  return parsed;
}

function envInteger(name, fallback) {
  const parsed = envNumber(name, fallback);
  if (!Number.isInteger(parsed)) throw new Error(`Invalid ${name}=${parsed}; expected an integer`);
  return parsed;
}
