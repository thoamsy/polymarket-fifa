import { createL1ClobClient, deriveOrCreateApiCreds, CLOB_HOST } from "./poly-common.mjs";

const { account, client } = createL1ClobClient();
const { creds, method } = await deriveOrCreateApiCreds(client);

console.log("CLOB API credentials derived successfully.");
console.log(`method=${method}`);
console.log(`CLOB_HOST=${CLOB_HOST}`);
console.log(`POLY_ADDRESS=${account.address}`);
console.log("");
console.log("Add these values to your local .env. Do not paste them into chat or commit them:");
console.log(`POLY_API_KEY=${creds.key}`);
console.log(`POLY_API_SECRET=${creds.secret}`);
console.log(`POLY_PASSPHRASE=${creds.passphrase}`);
