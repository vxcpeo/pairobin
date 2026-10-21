import { computed, onMounted, onUnmounted, ref } from "vue";
import EthereumProvider from "@walletconnect/ethereum-provider";

const env = import.meta.env || {};
// Ganache uses chain id 1337 by default. Production builds keep mainnet as the
// fallback, while local Vite development can connect to Ganache without an
// extra env file. Set VITE_CHAIN_ID explicitly when using another local chain.
const chainId = env.VITE_CHAIN_ID || (env.DEV ? "1337" : "0x1");
const chainIdDecimal = chainId.startsWith("0x") ? Number.parseInt(chainId, 16) : Number(chainId);
const targetChainHex = `0x${chainIdDecimal.toString(16)}`;
let walletConnectInstance;
let ganacheProvider;

function browserProviders() {
  if (typeof window === "undefined" || !window.ethereum) return [];
  const providers = window.ethereum.providers || [window.ethereum];
  return [...new Set(providers)];
}
function localGanacheProvider() {
  const rpcUrl = env.VITE_GANACHE_RPC_URL;
  if (!rpcUrl || typeof window === "undefined") return null;
  if (ganacheProvider) return ganacheProvider;
  const listeners = new Map();
  ganacheProvider = {
    isGanache: true,
    async request({ method, params = [] }) {
      // Ganache exposes unlocked accounts through eth_accounts and may reject
      // the interactive wallet method used by browser extensions.
      const rpcMethod = method === "eth_requestAccounts" ? "eth_accounts" : method;
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: rpcMethod, params }),
      });
      if (!response.ok) throw new Error(`Ganache RPC returned HTTP ${response.status}.`);
      const payload = await response.json();
      if (payload.error) {
        const error = new Error(payload.error.message || "Ganache RPC request failed.");
        error.code = payload.error.code;
        throw error;
      }
      return payload.result;
    },
    on(event, listener) { listeners.set(event, listener); },
    removeListener(event) { listeners.delete(event); },
  };
  return ganacheProvider;
}
function identifyProvider(provider) {
  if (provider?.isCoinbaseWallet) return "coinbase";
  if (provider?.isMetaMask) return "metamask";
  if (provider?.isGanache) return "ganache";
  return "injected";
}
function providerFor(id) {
  const providers = browserProviders();
  if (id === "metamask") return providers.find((item) => item.isMetaMask && !item.isCoinbaseWallet);
  if (id === "coinbase") return providers.find((item) => item.isCoinbaseWallet);
  if (id === "ganache") return localGanacheProvider();
  return providers[0] || localGanacheProvider();
}
export function discoverWallets() {
  const found = new Map();
  browserProviders().forEach((provider) => { const id = identifyProvider(provider); if (!found.has(id)) found.set(id, provider); });
  const ganache = localGanacheProvider();
  if (ganache) found.set("ganache", ganache);
  return [...found.entries()].map(([id, provider]) => ({ id, provider }));
}
export function walletAvailability() {
  return {
    metamask: Boolean(providerFor("metamask")),
    coinbase: Boolean(providerFor("coinbase")),
    injected: Boolean(providerFor()),
    ganache: Boolean(providerFor("ganache")),
    walletConnect: Boolean(env.VITE_WALLETCONNECT_PROJECT_ID),
  };
}
function classify(error) {
  if (error?.code === "WRONG_CHAIN" || error?.walletReason === "wrong-chain") return "wrong-chain";
  if (error?.code === 4001 || /reject|denied|cancel/i.test(error?.message || "")) return "rejected";
  return "unavailable";
}
function assertTargetChain(network) {
  const actual = typeof network === "string" ? (network.startsWith("0x") ? Number.parseInt(network, 16) : Number(network)) : Number(network);
  if (!Number.isInteger(actual) || actual !== chainIdDecimal) {
    const error = new Error(`Wrong EVM network. Expected chain ${chainIdDecimal}, received ${network}.`);
    error.code = "WRONG_CHAIN";
    throw error;
  }
}
async function ensureTargetChain(provider, network) {
  try {
    assertTargetChain(network);
    return network;
  } catch (error) {
    if (error.code !== "WRONG_CHAIN" || typeof provider?.request !== "function") throw error;
    try {
      try {
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainHex }] });
      } catch (switchError) {
        // MetaMask returns 4902 when a local Ganache chain has not been added.
        if (switchError?.code !== 4902 || provider?.isGanache) throw switchError;
        await provider.request({ method: "wallet_addEthereumChain", params: [{
          chainId: targetChainHex,
          chainName: env.VITE_CHAIN_NAME || "Ganache Local",
          nativeCurrency: { name: env.VITE_NATIVE_CURRENCY_NAME || "Ether", symbol: env.VITE_NATIVE_CURRENCY_SYMBOL || "ETH", decimals: 18 },
          rpcUrls: [env.VITE_GANACHE_RPC_URL || env.VITE_RPC_URL || "http://127.0.0.1:8545"],
        }] });
        await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetChainHex }] });
      }
      const switched = await provider.request({ method: "eth_chainId" });
      assertTargetChain(switched);
      return switched;
    } catch (switchError) {
      switchError.walletReason = switchError.code === 4001 ? "rejected" : "wrong-chain";
      throw switchError;
    }
  }
}
export async function connectInjected(id) {
  const provider = providerFor(id);
  if (!provider) { const error = new Error("No compatible EVM wallet is installed."); error.code = "NO_PROVIDER"; throw error; }
  try {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) throw new Error("The wallet returned no account.");
    const network = await ensureTargetChain(provider, await provider.request({ method: "eth_chainId" }));
    return { address: accounts[0], chainId: network, provider, walletId: identifyProvider(provider) };
  } catch (error) { error.walletReason = classify(error); throw error; }
}
export async function connectWalletConnect() {
  try {
    const projectId = env.VITE_WALLETCONNECT_PROJECT_ID;
    if (!projectId) { const error = new Error("VITE_WALLETCONNECT_PROJECT_ID is not configured."); error.code = "WALLETCONNECT_NOT_CONFIGURED"; throw error; }
    if (!walletConnectInstance) walletConnectInstance = await EthereumProvider.init({
      projectId, chains: [chainIdDecimal], showQrModal: true,
      metadata: { name: "Kudorix", description: "Back X accounts with verified X Money receipts", url: env.VITE_APP_URL || window.location.origin, icons: [] },
    });
    if (!walletConnectInstance.session) await walletConnectInstance.connect();
    const accounts = await walletConnectInstance.request({ method: "eth_accounts" });
    if (!accounts?.[0]) throw new Error("WalletConnect returned no account.");
    const network = await ensureTargetChain(walletConnectInstance, await walletConnectInstance.request({ method: "eth_chainId" }));
    return { address: accounts[0], chainId: network, provider: walletConnectInstance, walletId: "walletconnect" };
  } catch (error) { error.walletReason = classify(error); throw error; }
}
export function useWallet() {
  const address = ref("");
  const activeChainId = ref("");
  const provider = ref(null);
  const walletId = ref("");
  const connected = computed(() => Boolean(address.value));
  const onAccountsChanged = (accounts) => { address.value = accounts?.[0] || ""; if (!address.value) { walletId.value = ""; activeChainId.value = ""; } };
  const onChainChanged = (next) => { activeChainId.value = next; try { assertTargetChain(next); } catch { address.value = ""; walletId.value = ""; } };
  async function connect(id) {
    const result = id === "walletconnect" ? await connectWalletConnect() : await connectInjected(id);
    provider.value = result.provider; address.value = result.address; activeChainId.value = result.chainId; walletId.value = result.walletId;
    result.provider.on?.("accountsChanged", onAccountsChanged); result.provider.on?.("chainChanged", onChainChanged); return result;
  }
  async function disconnect() {
    const active = provider.value; active?.removeListener?.("accountsChanged", onAccountsChanged); active?.removeListener?.("chainChanged", onChainChanged);
    try { if (walletId.value === "walletconnect") await active?.disconnect?.(); }
    finally { provider.value = null; address.value = ""; activeChainId.value = ""; walletId.value = ""; }
  }
  onMounted(async () => {
    const candidate = providerFor(); if (!candidate) return;
    try { const accounts = await candidate.request({ method: "eth_accounts" }); if (!accounts?.[0]) return; const network = await candidate.request({ method: "eth_chainId" }); assertTargetChain(network); provider.value = candidate; walletId.value = identifyProvider(candidate); address.value = accounts[0]; activeChainId.value = network; candidate.on?.("accountsChanged", onAccountsChanged); candidate.on?.("chainChanged", onChainChanged); } catch { /* silent restore */ }
  });
  onUnmounted(() => { provider.value?.removeListener?.("accountsChanged", onAccountsChanged); provider.value?.removeListener?.("chainChanged", onChainChanged); });
  return { address, activeChainId, connected, provider, walletId, chainId, availability: walletAvailability(), connect, disconnect };
}
