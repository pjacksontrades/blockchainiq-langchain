// Unit tests with a stubbed transport — no network, no wallet, no spend.
//
// The stub payFetch mimics a settled x402 response: HTTP 200 with the
// data envelope and a PAYMENT-RESPONSE header carrying base64 JSON
// settlement proof, exactly the shape @x402/fetch decodes on a real call.

import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBlockchainIQTools } from "../src/tools.mjs";

const SETTLEMENT = {
  success: true,
  transaction: "0x" + "ab".repeat(32),
  network: "eip155:8453",
  payer: "0x3fc45A74726b3b19E485eCB6eE45F2A8A1f876DB",
};
const settlementHeader = Buffer.from(JSON.stringify(SETTLEMENT)).toString("base64");

function stubPayFetch(capture) {
  return async (url) => {
    capture.url = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { coins: [{ symbol: "btc" }] } }),
      headers: {
        get: (name) =>
          name.toLowerCase() === "payment-response" ? settlementHeader : null,
      },
    };
  };
}

const stubFreeFetch = async () => ({
  ok: true,
  status: 200,
  json: async () => ({ data: [{ id: "brief" }] }),
  headers: { get: () => null },
});

test("exposes the four LangChain tools with the expected names", () => {
  const tools = makeBlockchainIQTools({ payFetch: stubPayFetch({}), freeFetch: stubFreeFetch });
  assert.deepEqual(
    tools.map((t) => t.name).sort(),
    [
      "blockchainiq_catalogue",
      "blockchainiq_event_risk",
      "blockchainiq_market_brief",
      "blockchainiq_sample",
    ]
  );
});

test("market brief tool returns data plus the settlement proof (tx hash)", async () => {
  const capture = {};
  const tools = makeBlockchainIQTools({ payFetch: stubPayFetch(capture), freeFetch: stubFreeFetch });
  const brief = tools.find((t) => t.name === "blockchainiq_market_brief");
  const out = JSON.parse(await brief.invoke(""));
  assert.equal(capture.url, "https://www.blockchainiq.co/api/x402/v1/brief");
  assert.equal(out.data.coins[0].symbol, "btc");
  assert.equal(out.settlement.transaction, SETTLEMENT.transaction);
  assert.equal(out.settlement.network, "eip155:8453");
});

test("event risk tool builds the days query parameter", async () => {
  const capture = {};
  const tools = makeBlockchainIQTools({ payFetch: stubPayFetch(capture), freeFetch: stubFreeFetch });
  const risk = tools.find((t) => t.name === "blockchainiq_event_risk");
  await risk.invoke({ days: 14 });
  assert.equal(capture.url, "https://www.blockchainiq.co/api/x402/v1/event-risk?days=14");
});

test("free tools return catalogue data without any payment header", async () => {
  const tools = makeBlockchainIQTools({ payFetch: stubPayFetch({}), freeFetch: stubFreeFetch });
  const catalogue = tools.find((t) => t.name === "blockchainiq_catalogue");
  const out = JSON.parse(await catalogue.invoke(""));
  assert.equal(out[0].id, "brief");
});
