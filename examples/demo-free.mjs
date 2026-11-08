// Free demo: exercises everything that costs nothing.
//
//   node examples/demo-free.mjs
//
// 1. Fetches the free catalogue through the LangChain catalogue tool.
// 2. Fetches the free sample through the LangChain sample tool.
// 3. Makes an UNPAID request to /brief and captures the HTTP 402
//    PAYMENT-REQUIRED terms (an unpaid/error response is never charged),
//    proving the paid path is wired to the real endpoint and price.

import { mkdirSync, writeFileSync } from "node:fs";
import { makeBlockchainIQTools } from "../src/tools.mjs";
import { BIQ_BASE_URL } from "../src/client.mjs";

// No wallet: paid tools are constructed but never invoked in this demo.
const tools = makeBlockchainIQTools({ payFetch: fetch });
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

const catalogue = JSON.parse(await byName.blockchainiq_catalogue.invoke(""));
console.log(`Catalogue: ${catalogue.length ?? catalogue.data?.length ?? "?"} resources listed.`);

const sample = JSON.parse(await byName.blockchainiq_sample.invoke(""));
console.log("Sample (Bitcoin network):", JSON.stringify(sample.data ?? sample).slice(0, 300));

const res = await fetch(`${BIQ_BASE_URL}/brief`);
console.log(`\nUnpaid /brief request -> HTTP ${res.status} (expected 402)`);
const header = res.headers.get("payment-required");
const terms = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
console.log("PAYMENT-REQUIRED accepts:", JSON.stringify(terms.accepts, null, 2));

mkdirSync(new URL("../proof/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("../proof/free-flow-proof.json", import.meta.url),
  JSON.stringify(
    { capturedAt: new Date().toISOString(), unpaidStatus: res.status, accepts: terms.accepts },
    null,
    2
  )
);
console.log("\nTerms written to proof/free-flow-proof.json");
