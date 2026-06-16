// Mechanical validation of an LLM-authored plan. This is NOT strategy thinking — it is
// the set of hard safety rails the user explicitly asked for:
//   - W/D/L single-match markets only (no group-winner / advance / knockout).
//   - limitPrice <= maxPrice (no price chasing past the approved cap).
//   - per-order notional <= maxBetUsdc.
//   - run total notional <= maxRunNotionalUsdc.
//   - at most one order per match (eventSlug).
//   - price inside [priceMin, priceMax].
// The LLM decides WHICH team, the price, and the size. The code only checks the rails.

export const PLAN_STRATEGY = "world-cup-2026-matchday-moneyline";

const WIN_QUESTION = /^Will .+ win on \d{4}-\d{2}-\d{2}\?$/;
const DRAW_QUESTION = /^Will .+ vs\. .+ end in a draw\?$/;

export function validatePlan(plan, config) {
  const errors = [];
  const limits = config.limits;

  if (!plan || typeof plan !== "object") {
    return { ok: false, errors: ["plan is not an object"], orders: [] };
  }
  if (plan.strategy !== PLAN_STRATEGY) {
    errors.push(`strategy must be "${PLAN_STRATEGY}", got "${plan.strategy}"`);
  }

  const rawOrders = Array.isArray(plan.orders) ? plan.orders : [];
  if (rawOrders.length === 0) errors.push("plan has no orders");
  if (rawOrders.length > limits.maxOrdersPerRun) {
    errors.push(`plan has ${rawOrders.length} orders, exceeds maxOrdersPerRun=${limits.maxOrdersPerRun}`);
  }

  const seenEvents = new Set();
  const orders = [];
  let runNotional = 0;

  rawOrders.forEach((order, index) => {
    const tag = `order[${index}] (${order?.question || order?.tokenId || "unknown"})`;
    const eventSlug = String(order?.eventSlug || "");
    const marketSlug = String(order?.marketSlug || "");
    const question = String(order?.question || "");
    const tokenId = String(order?.tokenId || "");
    const side = String(order?.side || "");
    const outcome = String(order?.outcome || "");
    const limitPrice = Number(order?.limitPrice);
    const maxPrice = Number(order?.maxPrice);
    const size = Number(order?.size);
    const minSize = Number(order?.minSize ?? 0);

    if (!eventSlug.startsWith("fifwc-")) errors.push(`${tag}: eventSlug must start with "fifwc-", got "${eventSlug}"`);
    if (!marketSlug.startsWith(`${eventSlug}-`)) errors.push(`${tag}: marketSlug "${marketSlug}" does not belong to eventSlug "${eventSlug}"`);
    if (!WIN_QUESTION.test(question) && !DRAW_QUESTION.test(question)) {
      errors.push(`${tag}: question is not a W/D/L single-match market: "${question}"`);
    }
    if (!tokenId) errors.push(`${tag}: missing tokenId`);
    if (side !== "BUY") errors.push(`${tag}: side must be BUY, got "${side}"`);
    if (outcome !== "YES") errors.push(`${tag}: outcome must be YES, got "${outcome}"`);

    if (!Number.isFinite(limitPrice) || limitPrice <= 0 || limitPrice >= 1) {
      errors.push(`${tag}: invalid limitPrice=${order?.limitPrice}`);
    } else {
      if (limitPrice < limits.priceMin || limitPrice > limits.priceMax) {
        errors.push(`${tag}: limitPrice ${limitPrice} outside allowed [${limits.priceMin}, ${limits.priceMax}]`);
      }
      if (!Number.isFinite(maxPrice) || maxPrice <= 0 || maxPrice >= 1) {
        errors.push(`${tag}: missing/invalid maxPrice (approved cap) = ${order?.maxPrice}`);
      } else if (limitPrice > maxPrice + 1e-9) {
        errors.push(`${tag}: limitPrice ${limitPrice} exceeds approved maxPrice ${maxPrice} (no chasing)`);
      }
    }

    if (!Number.isFinite(size) || size <= 0) {
      errors.push(`${tag}: invalid size=${order?.size}`);
    } else if (minSize > 0 && size < minSize) {
      errors.push(`${tag}: size ${size} below market minSize ${minSize}`);
    }

    const notional = Number.isFinite(size) && Number.isFinite(limitPrice) ? round(size * limitPrice) : NaN;
    if (Number.isFinite(notional)) {
      if (notional > limits.maxBetUsdc + 1e-9) {
        errors.push(`${tag}: notional ${notional} exceeds maxBetUsdc ${limits.maxBetUsdc}`);
      }
      runNotional = round(runNotional + notional);
    }

    if (seenEvents.has(eventSlug)) {
      errors.push(`${tag}: more than one order for match ${eventSlug} (one view per match)`);
    }
    seenEvents.add(eventSlug);

    orders.push({ ...order, notional });
  });

  if (runNotional > limits.maxRunNotionalUsdc + 1e-9) {
    errors.push(`run total notional ${runNotional} exceeds maxRunNotionalUsdc ${limits.maxRunNotionalUsdc}`);
  }

  return { ok: errors.length === 0, errors, orders, runNotional };
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
