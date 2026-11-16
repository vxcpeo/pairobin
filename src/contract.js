import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
} from "viem";

const env = import.meta.env || {};

// This fallback ABI keeps the website usable before a deployment manifest is
// generated. A manifest may provide the complete artifact ABI instead.
const FALLBACK_ABI = [
  { type: "function", name: "campaignExists", stateMutability: "view", inputs: [{ name: "campaignId", type: "bytes32" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "holdDepositWei", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "createHold", stateMutability: "payable", inputs: [{ name: "holdId", type: "bytes32" }, { name: "campaignId", type: "bytes32" }, { name: "amountCents", type: "uint256" }], outputs: [] },
  { type: "function", name: "submitReceipt", stateMutability: "nonpayable", inputs: [{ name: "holdId", type: "bytes32" }, { name: "receiptHash", type: "bytes32" }], outputs: [] },
];

let deploymentPromise;

function asChainId(value) {
  if (typeof value === "string" && value.startsWith("0x")) return Number.parseInt(value, 16);
  return Number(value);
}

function rpcUrlFor(manifest) {
  return manifest?.rpcUrl || env.VITE_GANACHE_RPC_URL || env.VITE_RPC_URL || "http://127.0.0.1:8545";
}

function normalizeManifest(raw) {
  const address = raw?.contract?.address || raw?.address || raw?.contractAddress || env.VITE_MARKET_CONTRACT;
  if (!isAddress(address)) return null;
  const chainId = asChainId(raw?.chainId || env.VITE_CHAIN_ID || (env.DEV ? 1337 : 1));
  const campaigns = Array.isArray(raw?.campaigns) ? raw.campaigns : [];
  return {
    ...raw,
    address: getAddress(address),
    abi: raw?.contract?.abi || raw?.abi || FALLBACK_ABI,
    chainId,
    campaigns,
    holdDepositWei: raw?.holdDepositWei == null ? null : BigInt(raw.holdDepositWei),
  };
}

export async function loadDeployment() {
  if (deploymentPromise) return deploymentPromise;
  deploymentPromise = (async () => {
    try {
      const response = await fetch("/deployment.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`deployment.json returned ${response.status}`);
      return normalizeManifest(await response.json());
    } catch {
      // VITE_MARKET_CONTRACT is useful for an externally deployed test contract.
      return normalizeManifest({ chainId: env.VITE_CHAIN_ID, address: env.VITE_MARKET_CONTRACT });
    }
  })();
  return deploymentPromise;
}

function campaignFor(manifest, handle) {
  const bare = String(handle || "").replace(/^@/, "").toLowerCase();
  const expected = `@${bare}`;
  return manifest.campaigns.find((campaign) => {
    const candidate = String(campaign?.handle || campaign?.xHandle || "").toLowerCase();
    return candidate === expected || candidate.replace(/^@/, "") === bare;
  });
}

function chainFor(manifest) {
  const rpcUrl = rpcUrlFor(manifest);
  return {
    id: manifest.chainId,
    name: manifest.network || (manifest.chainId === 1337 ? "Ganache Local" : "Remitia EVM"),
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  };
}

function holdIdFor(address, handle, receipt) {
  const entropy = `${address.toLowerCase()}:${handle.toLowerCase()}:${receipt}:${Date.now()}:${Math.random()}`;
  return keccak256(stringToHex(entropy));
}

function classifyContractError(error) {
  const message = String(error?.shortMessage || error?.reason || error?.message || "");
  if (/user rejected|denied|rejected/i.test(message) || error?.code === 4001) return "Payment signature was rejected.";
  if (/insufficient funds/i.test(message)) return "The connected wallet has insufficient ETH for the hold deposit and gas.";
  if (/campaign|invalid amount|inactive/i.test(message)) return "This recipient has no active campaign for the selected amount.";
  if (/receipt|hold/i.test(message)) return "The contract rejected this receipt submission.";
  return message || "The local contract transaction failed.";
}

/**
 * Creates an on-chain hold and submits the X Money receipt hash. A null
 * deployment means the caller should keep the browser-only demo behavior.
 */
export async function submitPaymentOnChain({ provider, walletAddress, handle, amount, receipt }) {
  const manifest = await loadDeployment();
  if (!manifest) return { mode: "demo" };
  if (!provider || !walletAddress) throw new Error("Connect a wallet before submitting a contract payment.");

  const connectedChainId = asChainId(await provider.request({ method: "eth_chainId" }));
  if (manifest.chainId && connectedChainId !== manifest.chainId) {
    throw new Error(`Wrong contract network. Expected chain ${manifest.chainId}, received ${connectedChainId}.`);
  }
  const campaign = campaignFor(manifest, handle);
  const campaignId = campaign?.campaignId || campaign?.id;
  if (!campaignId || !/^0x[0-9a-fA-F]{64}$/.test(campaignId)) {
    throw new Error(`No campaign is configured for @${String(handle).replace(/^@/, "")}.`);
  }
  const amountCents = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) throw new Error("Payment amount must be at least $1.00.");

  const chain = chainFor(manifest);
  const transport = custom(provider);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account: walletAddress, chain, transport });
  const abi = manifest.abi || FALLBACK_ABI;
  try {
    const exists = await publicClient.readContract({ address: manifest.address, abi, functionName: "campaignExists", args: [campaignId] });
    if (!exists) throw new Error(`No active campaign is configured for @${String(handle).replace(/^@/, "")}.`);
    const deposit = manifest.holdDepositWei ?? await publicClient.readContract({ address: manifest.address, abi, functionName: "holdDepositWei" });
    const holdId = holdIdFor(walletAddress, handle, receipt);
    const createHash = await walletClient.writeContract({ address: manifest.address, abi, functionName: "createHold", account: walletAddress, args: [holdId, campaignId, BigInt(amountCents)], value: BigInt(deposit), gas: 300_000n });
    const createReceipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
    if (createReceipt.status !== "success") throw new Error("The hold transaction reverted on the local contract.");
    const receiptHash = keccak256(stringToHex(receipt.trim()));
    const submitHash = await walletClient.writeContract({ address: manifest.address, abi, functionName: "submitReceipt", account: walletAddress, args: [holdId, receiptHash], gas: 150_000n });
    const submitReceipt = await publicClient.waitForTransactionReceipt({ hash: submitHash });
    if (submitReceipt.status !== "success") throw new Error("The receipt transaction reverted on the local contract.");
    return { mode: "chain", campaignId, holdId, createHash, submitHash, address: manifest.address };
  } catch (error) {
    const wrapped = new Error(classifyContractError(error));
    wrapped.cause = error;
    throw wrapped;
  }
}

export { FALLBACK_ABI };
