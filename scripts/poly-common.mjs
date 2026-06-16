import "dotenv/config";
import { Chain, ClobClient, SignatureTypeV2 } from "@polymarket/clob-client-v2";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const CLOB_HOST = process.env.CLOB_HOST || "https://clob.polymarket.com";
export const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env first.`);
  }
  return value;
}

export function getSignatureType() {
  const raw = process.env.SIGNATURE_TYPE || "1";
  const value = Number(raw);
  if (!Number.isInteger(value) || !(value in SignatureTypeV2)) {
    throw new Error(`Invalid SIGNATURE_TYPE=${raw}. Use 0=EOA, 1=POLY_PROXY, 2=GNOSIS_SAFE, 3=POLY_1271.`);
  }
  return value;
}

export function getWalletClient() {
  const privateKey = requireEnv("PRIVATE_KEY");
  const account = privateKeyToAccount(privateKey);
  const walletClient = createWalletClient({
    account,
    transport: http(POLYGON_RPC_URL),
  });

  return { account, walletClient };
}

export function getApiCredsFromEnv() {
  const key = process.env.POLY_API_KEY;
  const secret = process.env.POLY_API_SECRET;
  const passphrase = process.env.POLY_PASSPHRASE;

  if (!key || !secret || !passphrase) return undefined;
  return { key, secret, passphrase };
}

export function createL1ClobClient() {
  const { account, walletClient } = getWalletClient();
  const client = new ClobClient({
    host: CLOB_HOST,
    chain: Chain.POLYGON,
    signer: walletClient,
    useServerTime: true,
    throwOnError: true,
  });

  return { account, client };
}

export async function deriveOrCreateApiCreds(client) {
  const failures = [];

  try {
    const creds = await client.deriveApiKey();
    if (creds?.key && creds?.secret && creds?.passphrase) {
      return { creds, method: "deriveApiKey" };
    }
    failures.push(`deriveApiKey returned an incomplete response: ${JSON.stringify(creds)}`);
  } catch (error) {
    failures.push(`deriveApiKey failed: ${formatApiError(error)}`);
  }

  try {
    const creds = await client.createApiKey();
    if (creds?.key && creds?.secret && creds?.passphrase) {
      return { creds, method: "createApiKey" };
    }
    failures.push(`createApiKey returned an incomplete response: ${JSON.stringify(creds)}`);
  } catch (error) {
    failures.push(`createApiKey failed: ${formatApiError(error)}`);
  }

  throw new Error(`Could not derive or create CLOB API credentials.\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

export async function createClobClient({ requireCreds = false } = {}) {
  const { account, walletClient } = getWalletClient();
  let creds = getApiCredsFromEnv();

  if (!creds && requireCreds) {
    const { client: l1Client } = createL1ClobClient();
    ({ creds } = await deriveOrCreateApiCreds(l1Client));
  }

  const client = new ClobClient({
    host: CLOB_HOST,
    chain: Chain.POLYGON,
    signer: walletClient,
    creds,
    signatureType: getSignatureType(),
    funderAddress: process.env.FUNDER_ADDRESS,
    useServerTime: true,
    retryOnError: true,
    throwOnError: true,
  });

  return { account, client, creds };
}

export function formatApiError(error) {
  if (!error || typeof error !== "object") return String(error);
  const pieces = [];
  if ("message" in error) pieces.push(String(error.message));
  if ("status" in error) pieces.push(`status=${error.status}`);
  if ("data" in error) pieces.push(`data=${JSON.stringify(error.data)}`);
  return pieces.join(" | ") || String(error);
}

export function formatBase6(value) {
  const raw = BigInt(String(value || "0"));
  const sign = raw < 0n ? "-" : "";
  const abs = raw < 0n ? -raw : raw;
  const whole = abs / 1_000_000n;
  const fraction = String(abs % 1_000_000n).padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}${fraction ? `.${fraction}` : ""}`;
}
