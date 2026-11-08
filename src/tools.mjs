// LangChain tools for the Blockchain IQ x402 API.
//
// Four tools:
//   blockchainiq_market_brief  — PAID $0.01 USDC (the bounty-qualifying call)
//   blockchainiq_event_risk    — PAID $0.05 USDC
//   blockchainiq_catalogue     — free: every resource, price and shape
//   blockchainiq_sample        — free: Bitcoin network activity sample
//
// Paid tools pay through x402 (USDC on Base) via the wrapped fetch from
// client.mjs and return the API data together with the settlement proof
// decoded from the PAYMENT-RESPONSE header (payer, network, tx hash).

import { DynamicTool, DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { BIQ_BASE_URL, decodePaymentResponseHeader } from "./client.mjs";

async function callPaid(payFetch, url) {
  const res = await payFetch(url);
  if (!res.ok) {
    throw new Error(`Blockchain IQ request failed: HTTP ${res.status} for ${url}`);
  }
  const body = await res.json();
  const header = res.headers.get("payment-response");
  const settlement = header ? decodePaymentResponseHeader(header) : null;
  return { data: body.data ?? body, settlement };
}

async function callFree(freeFetch, url) {
  const res = await freeFetch(url);
  if (!res.ok) {
    throw new Error(`Blockchain IQ request failed: HTTP ${res.status} for ${url}`);
  }
  const body = await res.json();
  return body.data ?? body;
}

/**
 * Build the LangChain tools.
 *
 * @param {object} opts
 * @param {typeof fetch} opts.payFetch - Payment-wrapped fetch (see client.mjs).
 * @param {typeof fetch} [opts.freeFetch] - Plain fetch for the free tools.
 * @returns {Array<DynamicTool|DynamicStructuredTool>}
 */
export function makeBlockchainIQTools({ payFetch, freeFetch = fetch } = {}) {
  if (typeof payFetch !== "function") {
    throw new Error("makeBlockchainIQTools requires a payFetch (see createPaymentFetch).");
  }

  const marketBrief = new DynamicTool({
    name: "blockchainiq_market_brief",
    description:
      "Get Blockchain IQ's crypto market brief: BTC, ETH, SOL and XRP prices with 24h/7d/30d moves and rank, " +
      "scheduled macro and crypto events in the next 48 hours, and short risk flags. Refreshed every minute. " +
      "Costs $0.01 USDC, paid automatically via x402 on Base. No input.",
    func: async () => JSON.stringify(await callPaid(payFetch, `${BIQ_BASE_URL}/brief`)),
  });

  const eventRisk = new DynamicStructuredTool({
    name: "blockchainiq_event_risk",
    description:
      "Get scheduled market-moving events (US data releases, FOMC/ECB/BoJ decisions, Treasury auctions, crypto " +
      "milestones) for the next N days, each ranked by importance. Costs $0.05 USDC, paid automatically via x402 on Base.",
    schema: z.object({
      days: z
        .number()
        .int()
        .min(1)
        .max(90)
        .optional()
        .describe("Look-ahead window in days, 1-90 (default 7)."),
    }),
    func: async ({ days }) =>
      JSON.stringify(await callPaid(payFetch, `${BIQ_BASE_URL}/event-risk?days=${days ?? 7}`)),
  });

  const catalogue = new DynamicTool({
    name: "blockchainiq_catalogue",
    description:
      "List every Blockchain IQ x402 resource with its price and response shape. Free, no payment. " +
      "Read this before choosing a paid resource.",
    func: async () => JSON.stringify(await callFree(freeFetch, BIQ_BASE_URL)),
  });

  const sample = new DynamicTool({
    name: "blockchainiq_sample",
    description:
      "Free unpaid sample of Blockchain IQ data: Bitcoin network activity (transactions, active addresses, " +
      "fees) for its latest single day. Use to test parsing before spending. No payment.",
    func: async () => JSON.stringify(await callFree(freeFetch, `${BIQ_BASE_URL}/sample`)),
  });

  return [marketBrief, eventRisk, catalogue, sample];
}

export default makeBlockchainIQTools;
