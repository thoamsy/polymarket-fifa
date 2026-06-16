import { AssetType } from "@polymarket/clob-client-v2";
import { createClobClient, formatBase6, getApiCredsFromEnv, getSignatureType } from "./poly-common.mjs";

const usingStoredCreds = Boolean(getApiCredsFromEnv());
const { account, client, creds } = await createClobClient({ requireCreds: true });

console.log("Polymarket CLOB verification");
console.log(`signer_address=${account.address}`);
console.log(`funder_address=${process.env.FUNDER_ADDRESS || "(not set)"}`);
console.log(`signature_type=${getSignatureType()}`);
console.log(`api_credentials=${usingStoredCreds ? "loaded_from_env" : "derived_in_memory"}`);
console.log("");

const closedOnly = await client.getClosedOnlyMode();
console.log(`closed_only=${closedOnly.closed_only}`);

const balance = await client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL });
console.log(`collateral_balance=${formatBase6(balance.balance)}`);
console.log(`allowance_spenders=${Object.keys(balance.allowances || {}).length}`);

const openOrders = await client.getOpenOrders(undefined, true);
console.log(`open_orders=${openOrders.length}`);
for (const order of openOrders.slice(0, 10)) {
  console.log(`- ${order.id} ${order.side} ${order.outcome} price=${order.price} original=${order.original_size} matched=${order.size_matched}`);
}

const trades = await client.getTrades(undefined, true);
console.log(`recent_trades=${trades.length}`);
for (const trade of trades.slice(0, 10)) {
  console.log(`- ${trade.id} ${trade.side} ${trade.outcome} price=${trade.price} size=${trade.size} status=${trade.status}`);
}

if (!usingStoredCreds && creds) {
  console.log("");
  console.log("Note: credentials were derived only in memory. Run `pnpm poly:derive-key` and save them to .env for repeatable runs.");
}
