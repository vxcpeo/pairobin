# Remitia website

This Vue/Vite application provides the Remitia interface for supporting X
accounts through X Money receipts and EVM native-currency reward pools.

## Wallets

`src/wallet.js` connects to real MetaMask, Coinbase Wallet, WalletConnect, or
compatible EIP-1193 providers. It never creates a placeholder address. The
wallet signs EVM transactions built by an API or the contract; it does not
handle X Money dollars.

Copy `.env.example` to `.env.local` and set the EVM chain and API origin before
testing real connections. X OAuth, hold creation, receipt verification, and
settlement require the Remitia backend; the local UI keeps submitted payments
in browser storage when that backend is unavailable.

For the local Ganache integration, run Ganache on `http://127.0.0.1:8545`, set
`VITE_CHAIN_ID=1337` and `VITE_GANACHE_RPC_URL=http://127.0.0.1:8545`, then
start Vite. The wallet dialog exposes the unlocked Ganache account. When
`public/deployment.json` is present, submitting a receipt sends `createHold`
and `submitReceipt` transactions to the manifest contract; without a manifest,
the same flow remains a browser-storage demonstration.

## Languages

English is the default locale. Simplified Chinese, Japanese, and Korean are
available from the header language selector. The choice is stored in browser
local storage under `remitia.locale`.
