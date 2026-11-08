// Blockchain IQ x402 payment client.
//
// Builds a fetch wrapper that answers HTTP 402 challenges from the
// Blockchain IQ API by signing an x402 "exact" payment in USDC on Base
// (EIP-3009 transferWithAuthorization). Settlement is gasless for the
// payer: the facilitator submits the transfer on-chain, so the wallet
// needs USDC only — no ETH.
//
// Usage matches Blockchain IQ's own copy-paste example on /agents:
//   npm install @x402/fetch @x402/evm viem

import { privateKeyToAccount } from "viem/accounts";
import {
  wrapFetchWithPayment,
  x402Client,
  decodePaymentResponseHeader,
} from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";

export const BIQ_BASE_URL = "https://www.blockchainiq.co/api/x402/v1";

/**
 * Create a payment-capable fetch for Blockchain IQ.
 *
 * @param {object} [opts]
 * @param {string} [opts.privateKey] - EVM private key (hex). Defaults to
 *   process.env.AGENT_PRIVATE_KEY. Use a dedicated wallet with a small
 *   balance, never a main wallet.
 * @param {number} [opts.maxUsdcPerCall=0.05] - Spend control: the client
 *   refuses any single payment above this many USDC.
 * @returns {{ payFetch: typeof fetch, payerAddress: string }}
 */
export function createPaymentFetch({ privateKey, maxUsdcPerCall = 0.05 } = {}) {
  let key = privateKey ?? process.env.AGENT_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "No payer key: pass { privateKey } or set AGENT_PRIVATE_KEY in the environment."
    );
  }
  if (!key.startsWith("0x")) key = `0x${key}`; // accept bare-hex keys
  const account = privateKeyToAccount(key);
  const client = x402Client.fromConfig({
    schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
    // Dollars per single payment; anything dearer is refused before signing.
    spendControls: { maxAmountPerPayment: maxUsdcPerCall },
  });
  return { payFetch: wrapFetchWithPayment(fetch, client), payerAddress: account.address };
}

export { decodePaymentResponseHeader };
