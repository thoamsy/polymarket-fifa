import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClobClient, formatApiError } from "./poly-common.mjs";
import { loadStrategyConfig } from "./lib/strategy-config.mjs";

// Monitor fills for the orders placed by the most recent execution. Any order still
// unfilled after `unfilledCancelSeconds` is cancelled (a stuck order means the price /
// limit was wrong, per the user's strategy). Polls every `pollIntervalSeconds`.

const config = await loadStrategyConfig();
const executionPath = path.resolve(process.argv[2] || "runs/latest-execution.json");
const execution = JSON.parse(await readFile(executionPath, "utf8"));

const posted = (execution.results || []).filter((r) => r.status === "POSTED" && r.orderId);
if (posted.length === 0) {
  console.log("No POSTED orders with order IDs in the execution log; nothing to watch.");
  process.exit(0);
}

const executedAtMs = Date.parse(execution.executedAt) || Date.now();
const deadlineMs = executedAtMs + config.execution.unfilledCancelSeconds * 1000;
const pollMs = config.execution.pollIntervalSeconds * 1000;

const { client } = await createClobClient({ requireCreds: true });

console.log(`Watching ${posted.length} order(s) from ${executionPath}`);
console.log(`cancel_unfilled_after=${config.execution.unfilledCancelSeconds}s poll_every=${config.execution.pollIntervalSeconds}s`);
console.log("");

const state = new Map(posted.map((r) => [r.orderId, { ...r, outcome: "WATCHING" }]));

while ([...state.values()].some((s) => s.outcome === "WATCHING")) {
  for (const [orderId, s] of state) {
    if (s.outcome !== "WATCHING") continue;
    await poll(orderId, s);
  }

  if ([...state.values()].every((s) => s.outcome !== "WATCHING")) break;
  await sleep(pollMs);
}

await writeReport();
printSummary();

async function poll(orderId, s) {
  let order;
  try {
    order = await client.getOrder(orderId);
  } catch (error) {
    // Order not retrievable usually means it fully matched or was already cancelled.
    s.outcome = "GONE";
    s.detail = formatApiError(error);
    console.log(`GONE order_id=${orderId} (${s.question}) — ${s.detail}`);
    return;
  }

  const original = Number(order?.original_size || s.size || 0);
  const matched = Number(order?.size_matched || 0);
  const status = String(order?.status || "");
  s.matched = matched;
  s.original = original;
  s.status = status;

  if (matched >= original && original > 0) {
    s.outcome = "FILLED";
    console.log(`FILLED order_id=${orderId} matched=${matched}/${original} (${s.question})`);
    return;
  }
  if (status && status !== "LIVE") {
    s.outcome = status === "MATCHED" ? "FILLED" : "RESOLVED";
    console.log(`${s.outcome} order_id=${orderId} status=${status} matched=${matched}/${original} (${s.question})`);
    return;
  }

  if (Date.now() >= deadlineMs) {
    try {
      await client.cancelOrder({ orderID: orderId });
      s.outcome = matched > 0 ? "CANCELLED_PARTIAL" : "CANCELLED_UNFILLED";
      console.log(`CANCELLED order_id=${orderId} matched=${matched}/${original} (${s.question}) — unfilled past ${config.execution.unfilledCancelSeconds}s`);
    } catch (error) {
      s.outcome = "CANCEL_ERROR";
      s.detail = formatApiError(error);
      console.error(`CANCEL_ERROR order_id=${orderId} — ${s.detail}`);
    }
    return;
  }

  const remainingS = Math.max(0, Math.round((deadlineMs - Date.now()) / 1000));
  console.log(`LIVE order_id=${orderId} matched=${matched}/${original} (cancel in ~${remainingS}s) (${s.question})`);
}

async function writeReport() {
  const report = {
    executionPath,
    watchedAt: new Date().toISOString(),
    unfilledCancelSeconds: config.execution.unfilledCancelSeconds,
    orders: [...state.values()].map((s) => ({
      orderId: s.orderId,
      question: s.question,
      eventSlug: s.eventSlug,
      limitPrice: s.limitPrice,
      size: s.size,
      notional: s.notional,
      matched: s.matched ?? 0,
      outcome: s.outcome,
      detail: s.detail,
    })),
  };
  await writeFile(path.resolve("runs", "latest-watch.json"), `${JSON.stringify(report, null, 2)}\n`);
}

function printSummary() {
  console.log("");
  console.log("Fill watch complete:");
  for (const s of state.values()) {
    console.log(`  ${s.outcome.padEnd(18)} ${s.question}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
