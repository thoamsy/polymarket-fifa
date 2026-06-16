import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AssetType, OrderType, Side } from "@polymarket/clob-client-v2";
import { createClobClient, formatApiError, formatBase6 } from "./poly-common.mjs";
import { loadStrategyConfig } from "./lib/strategy-config.mjs";
import { validatePlan } from "./lib/plan-validation.mjs";

const config = await loadStrategyConfig();
const planPath = path.resolve(process.argv[2] || config.execution.outputPath);
const plan = JSON.parse(await readFile(planPath, "utf8"));

// Two-key live gate: real orders require BOTH a deliberate config edit
// (execution.dryRun=false) AND POLY_EXECUTE=1 on the command line. A leftover
// POLY_EXECUTE=1 in .env alone can NEVER place orders, because the config defaults to
// dryRun=true. This is what stops "dry-run" tests from firing real money.
const polyExecute = process.env.POLY_EXECUTE === "1";
const configAllowsLive = config.execution.dryRun === false;
const live = polyExecute && configAllowsLive;

const { ok, errors, orders, runNotional } = validatePlan(plan, config);

console.log(`Plan: ${planPath}`);
console.log(`mode=${live ? "LIVE" : "DRY_RUN"} (POLY_EXECUTE=${polyExecute ? 1 : 0}, config.dryRun=${config.execution.dryRun})`);
if (polyExecute && !configAllowsLive) {
  console.log("note: POLY_EXECUTE=1 but config.execution.dryRun is true -> staying in DRY_RUN. Set dryRun=false in config to enable live orders.");
}
console.log(`orders=${orders.length} run_notional=${runNotional} (caps: maxBet=${config.limits.maxBetUsdc} maxRunNotional=${config.limits.maxRunNotionalUsdc})`);
console.log("");

for (const [index, order] of orders.entries()) {
  console.log(`${index + 1}. BUY ${order.outcome} ${order.notional} USDC @ limit=${order.limitPrice} (cap=${order.maxPrice}) size=${order.size}`);
  console.log(`   ${order.question}`);
  console.log(`   thesis: ${order.thesis || "(none)"}`);
}
console.log("");

if (!ok) {
  console.error("plan_rejected:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

assertFresh(plan, config);

if (!live) {
  console.log("DRY_RUN ok. No orders placed. To go live: set config.execution.dryRun=false AND run with POLY_EXECUTE=1.");
  process.exit(0);
}

await placeOrders(orders, planPath);

function assertFresh(plan, config) {
  const ageMs = Date.now() - Date.parse(plan.generatedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0) throw new Error(`Invalid plan generatedAt=${plan.generatedAt}`);
  const maxAgeMs = config.execution.planMaxAgeSeconds * 1000;
  if (ageMs > maxAgeMs) {
    throw new Error(`Plan is stale: age=${Math.round(ageMs / 1000)}s max=${config.execution.planMaxAgeSeconds}s. Re-author the plan from a fresh snapshot.`);
  }
}

async function placeOrders(orders, planPath) {
  const { client } = await createClobClient({ requireCreds: true });

  const balance = Number(formatBase6((await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })).balance));
  if (balance < runNotional) {
    throw new Error(`Collateral balance ${balance} is below run notional ${runNotional}; refusing to place orders.`);
  }
  console.log(`collateral_balance=${balance}`);

  const results = [];

  for (const order of orders) {
    try {
      const response = await client.createAndPostOrder(
        {
          tokenID: order.tokenId,
          price: order.limitPrice,
          side: Side.BUY,
          size: order.size,
        },
        {
          tickSize: order.tickSize,
          negRisk: Boolean(order.negRisk),
        },
        toOrderType(order.orderType || config.execution.orderType),
        order.postOnly === undefined ? config.execution.postOnly : Boolean(order.postOnly),
      );

      const orderId = response.orderID || response.orderId || response.id || response.order_id;
      results.push({
        status: "POSTED",
        orderId,
        question: order.question,
        eventSlug: order.eventSlug,
        tokenId: order.tokenId,
        limitPrice: order.limitPrice,
        size: order.size,
        notional: order.notional,
        response,
      });
      console.log(`POSTED order_id=${orderId || "(missing)"} notional=${order.notional} ${order.question}`);
    } catch (error) {
      results.push({
        status: "ERROR",
        question: order.question,
        eventSlug: order.eventSlug,
        tokenId: order.tokenId,
        limitPrice: order.limitPrice,
        size: order.size,
        notional: order.notional,
        error: formatApiError(error),
      });
      console.error(`ORDER_ERROR ${order.question} error=${formatApiError(error)}`);
      process.exitCode = 1;
      break;
    }
  }

  const executionPath = path.resolve("runs", `execution-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await mkdir(path.dirname(executionPath), { recursive: true });
  await writeFile(
    executionPath,
    `${JSON.stringify({ planPath, executedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  await writeFile(
    path.resolve("runs", "latest-execution.json"),
    `${JSON.stringify({ planPath, executedAt: new Date().toISOString(), executionPath, results }, null, 2)}\n`,
  );
  console.log(`execution_log=${executionPath}`);
  console.log("Next: `pnpm poly:watch-fills` to monitor fills and cancel anything unfilled after the timeout.");
}

function toOrderType(value) {
  if (!value || value === "GTC") return OrderType.GTC;
  if (!(value in OrderType)) throw new Error(`Unsupported orderType=${value}`);
  return OrderType[value];
}
