// Paid-call demo: runs the bounty-qualifying call end to end.
//
//   AGENT_PRIVATE_KEY=0x... node examples/demo-paid.mjs
//
// It invokes the LangChain `blockchainiq_market_brief` tool, which pays
// $0.01 USDC via x402 on Base (gasless for the payer) and returns the
// brief plus the settlement proof decoded from the PAYMENT-RESPONSE
// header. The proof is also written to proof/paid-call-proof.json.

import { mkdirSync, writeFileSync } from "node:fs";
import { createPaymentFetch } from "../src/client.mjs";
import { makeBlockchainIQTools } from "../src/tools.mjs";

const { payFetch, payerAddress } = createPaymentFetch({ maxUsdcPerCall: 0.05 });
console.log("Payer wallet:", payerAddress);

const tools = makeBlockchainIQTools({ payFetch });
const brief = tools.find((t) => t.name === "blockchainiq_market_brief");

const out = JSON.parse(await brief.invoke(""));
console.log("\n--- Market brief (paid data) ---");
console.log(JSON.stringify(out.data, null, 2).slice(0, 1200));

if (!out.settlement?.transaction) {
  console.error("\nNo settlement proof in the response — the paid call did NOT settle.");
  process.exit(1);
}

console.log("\n--- Proof of settlement ---");
console.log(JSON.stringify(out.settlement, null, 2));

const proof = {
  endpoint: "GET https://www.blockchainiq.co/api/x402/v1/brief",
  amountUsd: 0.01,
  asset: "USDC on Base (eip155:8453)",
  payer: out.settlement.payer ?? payerAddress,
  network: out.settlement.network,
  transaction: out.settlement.transaction,
  explorer: `https://basescan.org/tx/${out.settlement.transaction}`,
  settledAt: new Date().toISOString(),
};
mkdirSync(new URL("../proof/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../proof/paid-call-proof.json", import.meta.url),
  JSON.stringify(proof, null, 2)
);
console.log("\nProof written to proof/paid-call-proof.json");
