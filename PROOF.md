# Proof of the qualifying paid call

## Status: ✅ COMPLETE — paid call settled on-chain (2026-11-08)

The qualifying paid call to Blockchain IQ's x402 API has been executed and
settled. Exactly **0.01 USDC** was spent, from earned funds in the agent
wallet, under Paul Jackson's Nov 8, 2026 authorization (total cap $0.05).

## The settlement (the claim evidence)

- **Endpoint:** `GET https://www.blockchainiq.co/api/x402/v1/brief`
- **HTTP status:** 200
- **Settlement transaction:**
  `0x6b76c9980cdb54830ab965e7fbc0b9f5d488f8be164c33d2cad207fdda2c6687`
- **Explorer:** https://basescan.org/tx/0x6b76c9980cdb54830ab965e7fbc0b9f5d488f8be164c33d2cad207fdda2c6687
- **Network:** Base (`eip155:8453`), block **54809074**, receipt status `0x1`
- **On-chain USDC Transfer (verified via Base JSON-RPC receipt):**
  from payer `0x3fc45A74726b3b19E485eCB6eE45F2A8A1f876DB`
  to payTo `0x617dA9383fbA67e86137BC4924b8b7E400fB7C9e`,
  amount **0.01 USDC** (EIP-3009 `transferWithAuthorization`, submitted by
  the facilitator — gasless for the payer)
- **Decoded `PAYMENT-RESPONSE` header:** `{ success: true, payer:
  "0x3fc45A74726b3b19E485eCB6eE45F2A8A1f876DB", network: "eip155:8453",
  transaction: "0x6b76…c6687" }`
- **Wallet balance:** 2.000000 USDC before → **1.990000 USDC after**
  (verified three ways: Taskmarket CLI stats, on-chain `balanceOf`
  before, on-chain `balanceOf` after)
- Machine-readable copies: `proof/paid-call-proof.json`,
  `proof/paid-call-full-response.json`, `proof/paid-call-retry-headers.json`,
  `proof/paid-call-retry-response.json`.

## The data returned (the integration works)

The paid call returned the live market brief (full body in
`proof/paid-call-full-response.json`), `asOf` 2026-11-08T15:36:29Z:

- **Coins:** BTC $75,968 (24h +0.32%, rank 1) · ETH $2,238.05 (24h −0.02%,
  rank 2) · SOL $89.60 (24h +0.16%, rank 7) · XRP $1.16 (24h +0.00%, rank 5),
  each with 7d/30d moves
- **Events (48h):** Dash v24 hard fork deadline (2026-11-09, Crypto,
  importance 2) · US CPI (2026-11-10 08:30, Macro, importance 3)
- **Flag:** "1 high-importance event in the next 48h: US CPI (2026-11-10
  08:30 ET)"

## Execution notes (full transparency)

- **Attempt 1** (via the LangChain tool, ~15:32–15:34Z) returned the live
  brief data but **no settlement proof**, after a ~165 s run. Balance was
  verified three ways afterwards (Taskmarket stats + on-chain
  `balanceOf`): **zero funds moved** — no settlement occurred; its payment
  authorization expired unsettled (300 s window). Evidence:
  `proof/paid-call-attempt1-response.json`,
  `proof/paid-call-attempt1-output.log`.
- **Attempt 2** (the project's payment fetch called directly, so all raw
  headers were captured) settled in ~20 s with the transaction above.
  Attempt 2 was the one and only retry, taken only after zero-funds-moved
  was verified on-chain, per the run's retry rule.
- **Total spent across both attempts: exactly 0.01 USDC** (one settlement).
- Live 402 terms were re-confirmed immediately before the retry (unpaid
  probe): scheme `exact`, network `eip155:8453`, amount `"10000"` =
  0.01 USDC, asset `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (native
  USDC on Base), payTo `0x617dA9383fbA67e86137BC4924b8b7E400fB7C9e`,
  `maxTimeoutSeconds` 300 — identical to the terms captured Nov 7 in
  `proof/free-flow-proof.json`.

## Pre-spend verification (same run, before any payment)

1. **Balance:** agent wallet held **2.000000 USDC** (Taskmarket CLI stats +
   on-chain `balanceOf`), ≥ the 0.01 USDC required. No ETH needed
   (settlement is gasless for the payer).
2. **Tests:** `npm test` — **4/4 pass** (tool names/schemas, brief tool
   returning data + decoded settlement over a stubbed transport,
   event-risk URL building, free-tool behaviour).
3. **Code path inspected:** the paid demo invokes only the
   `blockchainiq_market_brief` tool → `GET /brief`; the client enforces
   `spendControls.maxAmountPerPayment = 0.05` before signing.

## How a reviewer can verify

1. Open the explorer link: a USDC `transferWithAuthorization` of 0.01 USDC
   on Base from the payer to `0x617dA9383fbA67e86137BC4924b8b7E400fB7C9e`,
   block 54809074.
2. Re-run the paid call with any wallet holding ≥ 0.01 USDC on Base
   (`npm run demo:paid`): a fresh brief and a fresh settlement hash come
   back.
3. Re-run `npm run demo:free` and `npm test` — both pass without a wallet.
