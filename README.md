# Blockchain IQ for LangChain

LangChain tools for the [Blockchain IQ](https://www.blockchainiq.co/agents) x402
pay-per-call crypto data API. No account, no API key: the tools pay per call in
USDC on Base using the open [x402](https://www.x402.org/) standard (HTTP 402 →
sign → retry), and return the data together with the on-chain settlement proof.

Built for the **LangChain slot** of Blockchain IQ's
[x402 build bounties](https://blockchainiq.co/blog/x402-build-bounties).

## Tools

| Tool | Price | What it returns |
| --- | --- | --- |
| `blockchainiq_market_brief` | **$0.01 USDC** (paid via x402) | BTC, ETH, SOL and XRP prices with 24h/7d/30d moves and rank, macro/crypto events in the next 48h, and risk flags. Refreshed every minute. |
| `blockchainiq_event_risk` | **$0.05 USDC** (paid via x402) | Scheduled market-moving events for the next 1–90 days, ranked by importance. |
| `blockchainiq_catalogue` | Free | Every API resource with its price and response shape. |
| `blockchainiq_sample` | Free | Unpaid Bitcoin network-activity sample, for testing parsing before spending. |

Paid tools return `{ data, settlement }` where `settlement` is decoded from the
response's `PAYMENT-RESPONSE` header and contains the payer, the network
(`eip155:8453`) and the **settlement transaction hash**.

## Install and run

```bash
npm install
```

Use a **dedicated wallet holding a little USDC on Base** — never a main
wallet. Settlement is gasless for the payer (the x402 facilitator submits the
EIP-3009 transfer), so the wallet needs USDC only, no ETH.

```bash
# Free: catalogue + sample through the tools, plus the live 402 terms of /brief
npm run demo:free

# Paid: the qualifying call — market brief for $0.01, proof printed and saved
AGENT_PRIVATE_KEY=0x... npm run demo:paid

# Unit tests (stubbed transport — no network, no wallet, no spend)
npm test
```

## Use in a LangChain agent

```js
import { createPaymentFetch } from "blockchainiq-langchain/client";
import { makeBlockchainIQTools } from "blockchainiq-langchain";

const { payFetch } = createPaymentFetch({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  maxUsdcPerCall: 0.05, // spend control: refuse any single call above this
});
const tools = makeBlockchainIQTools({ payFetch });
// Pass `tools` to any LangChain agent (createReactAgent, AgentExecutor, ...).
```

The payment layer is exactly the stack from Blockchain IQ's own
[copy-paste example](https://www.blockchainiq.co/agents): `@x402/fetch`'s
`wrapFetchWithPayment` + `x402Client`, with the `ExactEvmScheme` from
`@x402/evm` and a viem account as signer. Spend control is on by default
(`maxAmountPerPayment`), so an agent can never be charged more per call than
you set; a 404 or error response is never charged.

## Layout

- `src/client.mjs` — builds the x402 payment fetch from a private key.
- `src/tools.mjs` — the four LangChain tools (`makeBlockchainIQTools`).
- `examples/demo-paid.mjs` — runs the paid brief call, saves `proof/paid-call-proof.json`.
- `examples/demo-free.mjs` — runs the free tools and captures the live 402 terms.
- `test/tools.test.mjs` — unit tests over a stubbed settled-x402 transport.
- `PROOF.md` — the qualifying paid call and how to verify it on-chain.

## Bounty requirement map

From the bounty post (blockchainiq.co/blog/x402-build-bounties) and /agents:

| Requirement | Where it is satisfied |
| --- | --- |
| A LangChain integration (one of the four framework slots) | `src/tools.mjs` — four `DynamicTool`/`DynamicStructuredTool`s built on `@langchain/core` |
| Public repository | This repo (to be published under the claimant's GitHub) |
| A working paid call through x402 | `examples/demo-paid.mjs`, run against the live API; proof in `PROOF.md` |
| Paid call to `brief` ($0.01) or `event-risk` ($0.05) | `blockchainiq_market_brief` → `GET /api/x402/v1/brief`; `blockchainiq_event_risk` → `GET /api/x402/v1/event-risk` |
| Payment in USDC on Base via the x402 standard | `src/client.mjs` — `@x402/fetch` + `@x402/evm` exact scheme, network `eip155:8453` |
| Claim by email with repo link + settlement tx hash | Settlement proof returned by every paid tool and saved by the demo; see `PROOF.md` |

Market data and analysis, not investment advice. MIT licensed.
