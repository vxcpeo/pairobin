<script setup>
import { computed, onMounted, ref, watch } from "vue";
import LanguageSelector from "./components/LanguageSelector.vue";
import { useI18n } from "./i18n";
import { useWallet } from "./wallet";
import { submitPaymentOnChain } from "./contract";

const { locale } = useI18n();
const wallet = useWallet();
const catalogs = {
  en: {
    nav: { explore: "Explore", bounties: "Bounties", activity: "Activity", about: "How it works", account: "Account" },
    common: { connect: "Connect wallet", disconnect: "Disconnect", close: "Close", search: "Search", send: "Send payment", continue: "Continue", verify: "Verify payment", copied: "Copied", copy: "Copy", back: "Back" },
    home: { eyebrow: "BACK PEOPLE ON X", title: "Send money to anyone on X.", lead: "Pay someone in X Money, attach the receipt, and earn your share when their campaign generates fees.", search: "Search an X handle", placeholder: "@username", featured: "People worth backing", recent: "Recent payments", empty: "No recipients match that handle.", connectNote: "Connect an EVM wallet to start backing people." },
    pay: { title: "Back @{handle}", subtitle: "Your payment goes directly to them in X Money.", amount: "Payment amount", min: "Minimum payment $1.00", receipt: "X Money receipt link", receiptPlaceholder: "Paste the receipt link", receiptHelp: "In X Money, open the payment, choose Share receipt, then Copy link.", review: "Review payment", recipient: "Recipient", total: "You pay", reward: "Potential reward", rewardHelp: "Paid from creator fees, not from your wallet.", submit: "I sent the payment", success: "Payment submitted for verification", invalidReceipt: "Paste a valid X Money receipt link.", wrongReceipt: "This receipt cannot be verified for the selected recipient.", noWallet: "Link an EVM wallet on your account page before placing a payment." },
    account: { title: "Your account", xSignIn: "Sign in with X", wallet: "Linked EVM wallet", noWallet: "No wallet linked", walletHelp: "Your wallet receives rewards and signs on-chain actions.", supported: "MetaMask, Coinbase Wallet and WalletConnect are supported." },
    activity: { title: "Activity", count: "payments", empty: "Your payments will appear here.", pending: "Pending verification", verified: "Verified", paid: "Reward paid" },
    bounties: { title: "Bounties", lead: "Campaigns whose fee pools fund real payments to people on X.", noData: "New bounties are added as creators launch campaigns.", explore: "Explore people" },
    footer: { terms: "Terms", security: "Security", docs: "Docs", tagline: "People-first payments on X." },
    wallet: { title: "Connect an EVM wallet", lead: "Remitia never holds your keys. Your wallet signs transactions Remitia builds.", metamask: "MetaMask", coinbase: "Coinbase Wallet", walletConnect: "WalletConnect", ganache: "Local Ganache", missing: "Install MetaMask or Coinbase Wallet, or configure WalletConnect.", rejected: "Wallet connection was rejected.", wrongChain: "Switch to the configured EVM network to continue.", unavailable: "No compatible EVM wallet was found." },
  },
  "zh-CN": {
    nav: { explore: "探索", bounties: "悬赏", activity: "活动", about: "使用说明", account: "账户" },
    common: { connect: "连接钱包", disconnect: "断开连接", close: "关闭", search: "搜索", send: "发送付款", continue: "继续", verify: "验证付款", copied: "已复制", copy: "复制", back: "返回" },
    home: { eyebrow: "支持 X 上的人", title: "给任何 X 账号转账。", lead: "通过 X Money 付款，附上回执；当对方的活动产生手续费时，你可以获得回报。", search: "搜索 X 用户名", placeholder: "@用户名", featured: "值得支持的人", recent: "最近付款", empty: "没有匹配的收款人。", connectNote: "连接 EVM 钱包后即可开始支持。" },
    pay: { title: "支持 @{handle}", subtitle: "付款将通过 X Money 直接发送给对方。", amount: "付款金额", min: "最低付款金额 $1.00", receipt: "X Money 回执链接", receiptPlaceholder: "粘贴回执链接", receiptHelp: "在 X Money 打开付款，选择分享回执，然后复制链接。", review: "确认付款", recipient: "收款人", total: "付款金额", reward: "预计回报", rewardHelp: "回报来自创作者手续费，不会从你的钱包扣除。", submit: "我已发送付款", success: "付款已提交，等待验证", invalidReceipt: "请输入有效的 X Money 回执链接。", wrongReceipt: "无法验证该回执与所选收款人匹配。", noWallet: "请先在账户页面关联 EVM 钱包。" },
    account: { title: "我的账户", xSignIn: "登录 X", wallet: "已关联的 EVM 钱包", noWallet: "未关联钱包", walletHelp: "钱包用于接收回报并签署链上操作。", supported: "支持 MetaMask、Coinbase Wallet 和 WalletConnect。" },
    activity: { title: "活动", count: "笔付款", empty: "你的付款会显示在这里。", pending: "等待验证", verified: "已验证", paid: "回报已支付" },
    bounties: { title: "悬赏", lead: "用费用池支持 X 上真实的人。", noData: "创作者创建活动后会出现新的悬赏。", explore: "探索收款人" },
    footer: { terms: "条款", security: "安全", docs: "文档", tagline: "为 X 上的人提供支付支持。" },
    wallet: { title: "连接 EVM 钱包", lead: "Remitia 不会保管你的私钥，交易由你的钱包签名。", metamask: "MetaMask", coinbase: "Coinbase Wallet", walletConnect: "WalletConnect", ganache: "本地 Ganache", missing: "请安装 MetaMask 或 Coinbase Wallet，或配置 WalletConnect。", rejected: "钱包连接已拒绝。", wrongChain: "请切换到配置的 EVM 网络后继续。", unavailable: "未检测到兼容的 EVM 钱包。" },
  },
  "ja-JP": {
    nav: { explore: "探索", bounties: "バウンティ", activity: "アクティビティ", about: "使い方", account: "アカウント" },
    common: { connect: "ウォレットを接続", disconnect: "接続解除", close: "閉じる", search: "検索", send: "支払いを送る", continue: "続ける", verify: "支払いを確認", copied: "コピー済み", copy: "コピー", back: "戻る" },
    home: { eyebrow: "X の人を支援", title: "X の誰にでも送金。", lead: "X Money で支払い、レシートを添付。相手のキャンペーンが手数料を生むと報酬を受け取れます。", search: "X ハンドルを検索", placeholder: "@username", featured: "支援したい人", recent: "最近の支払い", empty: "一致する受取人がいません。", connectNote: "EVM ウォレットを接続して支援を始めましょう。" },
    pay: { title: "@{handle} を支援", subtitle: "支払いは X Money で相手に直接届きます。", amount: "支払い金額", min: "最低支払額 $1.00", receipt: "X Money レシートリンク", receiptPlaceholder: "レシートリンクを貼り付け", receiptHelp: "X Money で支払いを開き、レシートを共有してリンクをコピーします。", review: "支払いを確認", recipient: "受取人", total: "支払額", reward: "予想報酬", rewardHelp: "ウォレットではなくクリエイター手数料から支払われます。", submit: "支払いを送信しました", success: "支払いを検証に送信しました", invalidReceipt: "有効な X Money レシートリンクを入力してください。", wrongReceipt: "このレシートを受取人に確認できません。", noWallet: "アカウントで EVM ウォレットをリンクしてください。" },
    account: { title: "アカウント", xSignIn: "X にログイン", wallet: "リンク済み EVM ウォレット", noWallet: "ウォレット未接続", walletHelp: "報酬の受取とオンチェーン操作の署名に使います。", supported: "MetaMask、Coinbase Wallet、WalletConnect に対応。" },
    activity: { title: "アクティビティ", count: "件の支払い", empty: "支払いがここに表示されます。", pending: "確認待ち", verified: "確認済み", paid: "報酬支払い済み" },
    bounties: { title: "バウンティ", lead: "手数料プールで X の人への支払いを支援するキャンペーン。", noData: "クリエイターがキャンペーンを開始すると表示されます。", explore: "受取人を探索" },
    footer: { terms: "規約", security: "セキュリティ", docs: "ドキュメント", tagline: "X の人のための支払い。" },
    wallet: { title: "EVM ウォレットを接続", lead: "Remitia は秘密鍵を保管しません。トランザクションはウォレットで署名します。", ganache: "ローカル Ganache", missing: "MetaMask または Coinbase Wallet をインストールするか、WalletConnect を設定してください。", rejected: "ウォレット接続が拒否されました。", wrongChain: "続行するには設定済みの EVM ネットワークへ切り替えてください。", unavailable: "対応する EVM ウォレットが見つかりません。" },
  },
  "ko-KR": {
    nav: { explore: "탐색", bounties: "바운티", activity: "활동", about: "사용 방법", account: "계정" },
    common: { connect: "지갑 연결", disconnect: "연결 해제", close: "닫기", search: "검색", send: "결제 보내기", continue: "계속", verify: "결제 확인", copied: "복사됨", copy: "복사", back: "뒤로" },
    home: { eyebrow: "X의 사람들을 후원하세요", title: "X의 누구에게나 송금하세요.", lead: "X Money로 결제하고 영수증을 첨부하면 상대 캠페인의 수수료에서 보상을 받을 수 있습니다.", search: "X 핸들 검색", placeholder: "@username", featured: "후원할 사람", recent: "최근 결제", empty: "일치하는 수취인이 없습니다.", connectNote: "EVM 지갑을 연결하면 후원을 시작할 수 있습니다." },
    pay: { title: "@{handle} 후원", subtitle: "결제금은 X Money를 통해 상대에게 직접 전달됩니다.", amount: "결제 금액", min: "최소 결제 $1.00", receipt: "X Money 영수증 링크", receiptPlaceholder: "영수증 링크 붙여넣기", receiptHelp: "X Money에서 결제를 열고 영수증 공유 후 링크를 복사하세요.", review: "결제 검토", recipient: "수취인", total: "결제 금액", reward: "예상 보상", rewardHelp: "지갑이 아닌 크리에이터 수수료에서 지급됩니다.", submit: "결제를 보냈습니다", success: "결제가 확인 대기열에 추가되었습니다", invalidReceipt: "유효한 X Money 영수증 링크를 입력하세요.", wrongReceipt: "선택한 수취인에 대한 영수증을 확인할 수 없습니다.", noWallet: "계정에서 EVM 지갑을 먼저 연결하세요." },
    account: { title: "내 계정", xSignIn: "X 로그인", wallet: "연결된 EVM 지갑", noWallet: "연결된 지갑 없음", walletHelp: "보상을 받고 온체인 작업에 서명하는 지갑입니다.", supported: "MetaMask, Coinbase Wallet, WalletConnect를 지원합니다." },
    activity: { title: "활동", count: "건 결제", empty: "결제 내역이 여기에 표시됩니다.", pending: "확인 대기", verified: "확인됨", paid: "보상 지급됨" },
    bounties: { title: "바운티", lead: "수수료 풀로 X의 실제 사람에게 결제를 지원하는 캠페인입니다.", noData: "크리에이터가 캠페인을 시작하면 바운티가 표시됩니다.", explore: "수취인 탐색" },
    footer: { terms: "약관", security: "보안", docs: "문서", tagline: "X의 사람들을 위한 결제." },
    wallet: { title: "EVM 지갑 연결", lead: "Remitia는 개인 키를 보관하지 않습니다. 트랜잭션은 지갑에서 서명합니다.", ganache: "로컬 Ganache", missing: "MetaMask 또는 Coinbase Wallet을 설치하거나 WalletConnect를 설정하세요.", rejected: "지갑 연결이 거부되었습니다.", wrongChain: "계속하려면 설정된 EVM 네트워크로 전환하세요.", unavailable: "호환되는 EVM 지갑을 찾을 수 없습니다." },
  },
};
const copy = computed(() => catalogs[locale.value] || catalogs.en);
const page = ref("explore");
const search = ref("");
const selected = ref(null);
const amount = ref("25");
const receipt = ref("");
const step = ref("amount");
const modal = ref("");
const toast = ref("");
const payments = ref([]);
const submitting = ref(false);
const people = ref([
  { handle: "jack", name: "Jack Dorsey", bio: "Building open protocols", color: "#83e7b0", coins: 3, delivered: "$18,420" },
  { handle: "balajis", name: "Balaji", bio: "Network state researcher", color: "#c7b7ff", coins: 2, delivered: "$9,850" },
  { handle: "sama", name: "Sam Altman", bio: "OpenAI", color: "#f5ca8a", coins: 1, delivered: "$4,230" },
  { handle: "naval", name: "Naval", bio: "How to get rich without getting lucky", color: "#8bc8ef", coins: 4, delivered: "$27,410" },
  { handle: "paulg", name: "Paul Graham", bio: "Y Combinator", color: "#f0a7a7", coins: 2, delivered: "$12,700" },
]);
const filteredPeople = computed(() => { const q = search.value.trim().replace(/^@/, "").toLowerCase(); return q ? people.value.filter((p) => p.handle.includes(q) || p.name.toLowerCase().includes(q)) : people.value; });
const walletAddress = computed(() => wallet.address.value);
const walletName = computed(() => wallet.walletId.value === "metamask" ? "MetaMask" : wallet.walletId.value === "coinbase" ? "Coinbase Wallet" : wallet.walletId.value === "walletconnect" ? "WalletConnect" : wallet.walletId.value === "ganache" ? "Local Ganache" : wallet.walletId.value || "EVM wallet");
const amountNumber = computed(() => Number(amount.value));
const formattedAmount = computed(() => Number.isFinite(amountNumber.value) && amountNumber.value > 0 ? `$${amountNumber.value.toFixed(2)}` : "$0.00");
function shortAddress(address) { return address ? `${address.slice(0, 4)}…${address.slice(-4)}` : ""; }
function notify(message) { toast.value = message; window.clearTimeout(notify.timer); notify.timer = window.setTimeout(() => { toast.value = ""; }, 3600); }
function navigate(next) { const path = next.startsWith("/") ? next : `/${next}`; window.history.pushState({}, "", path); resolvePath(); window.scrollTo({ top: 0, behavior: "smooth" }); }
function resolvePath() { const path = window.location.pathname; if (path.startsWith("/x/")) { const person = people.value.find((item) => item.handle === decodeURIComponent(path.slice(3)).toLowerCase()); if (person) { if (selected.value?.handle !== person.handle) { step.value = "amount"; receipt.value = ""; } selected.value = person; page.value = "pay"; return; } } page.value = path === "/bounties" ? "bounties" : path === "/activity" ? "activity" : path === "/account" ? "account" : "explore"; }
function choosePerson(person) { selected.value = person; step.value = "amount"; receipt.value = ""; navigate(`/x/${person.handle}`); }
function openPayment() { if (!selected.value) return; if (!wallet.connected.value) { modal.value = "wallet"; return; } if (!Number.isFinite(amountNumber.value) || amountNumber.value < 1) { notify(copy.value.pay.min); return; } step.value = "receipt"; }
async function validateReceipt() {
  if (submitting.value) return;
  if (!wallet.connected.value) { modal.value = "wallet"; return; }
  let link;
  try {
    link = new URL(receipt.value.trim());
    const hostname = link.hostname.toLowerCase();
    if (link.protocol !== "https:" || (hostname !== "x.com" && hostname !== "twitter.com")) throw new Error();
  } catch { notify(copy.value.pay.invalidReceipt); return; }
  submitting.value = true;
  try {
    const result = await submitPaymentOnChain({ provider: wallet.provider.value, walletAddress: walletAddress.value, handle: selected.value.handle, amount: amountNumber.value, receipt: receipt.value.trim() });
    const item = { id: Date.now(), handle: selected.value.handle, name: selected.value.name, amount: amountNumber.value, status: "pending", time: new Date().toISOString(), mode: result.mode, holdId: result.holdId, createHash: result.createHash, submitHash: result.submitHash };
    payments.value.unshift(item);
    localStorage.setItem("remitia.payments", JSON.stringify(payments.value));
    step.value = "success";
    notify(copy.value.pay.success);
  } catch (error) {
    notify(error?.message || copy.value.pay.invalidReceipt);
  } finally { submitting.value = false; }
}
async function connect(provider = "metamask") { try { await wallet.connect(provider); modal.value = ""; notify(`${walletName.value} connected`); } catch (error) { notify(error?.walletReason === "rejected" ? copy.value.wallet.rejected : error?.walletReason === "wrong-chain" ? copy.value.wallet.wrongChain : copy.value.wallet.unavailable); } }
async function disconnect() { try { await wallet.disconnect(); } finally { modal.value = ""; notify(copy.value.common.disconnect); } }
function copyReceipt() { navigator.clipboard?.writeText(receipt.value); notify(copy.value.common.copied); }
function statusLabel(status) { return status === "verified" ? copy.value.activity.verified : status === "paid" ? copy.value.activity.paid : copy.value.activity.pending; }
function xUrl(handle) { return `https://x.com/${handle}`; }
onMounted(() => { resolvePath(); try { payments.value = JSON.parse(localStorage.getItem("remitia.payments") || "[]"); } catch { payments.value = []; } window.addEventListener("popstate", resolvePath); });
watch(locale, () => { document.documentElement.lang = locale.value; });
</script>
<template>
  <div class="gum-stage" :inert="Boolean(modal)">
    <header class="gum-chrome">
      <button class="gum-brand" @click="navigate('/')">
        <span class="gum-brand__badge" aria-hidden="true">R</span>
        <span class="gum-brand__word">remitia</span>
      </button>
      <p class="gum-chrome__motto">{{ copy.footer.tagline }}</p>
      <div class="gum-chrome__tools">
        <LanguageSelector />
        <button class="gum-wallet" :class="{ 'is-linked': wallet.connected.value }" @click="modal = wallet.connected.value ? 'account' : 'wallet'">
          <span class="gum-wallet__led" aria-hidden="true"></span>{{ wallet.connected.value ? shortAddress(walletAddress) : copy.common.connect }}
        </button>
      </div>
    </header>

    <main class="gum-canvas">
      <template v-if="page === 'explore'">
        <div class="gum-grid">
          <section class="gum-tile gum-tile--hero">
            <p class="gum-kicker">{{ copy.home.eyebrow }}</p>
            <h1 class="gum-title">{{ copy.home.title }}</h1>
            <p class="gum-lede">{{ copy.home.lead }}</p>
            <div class="gum-search">
              <span class="gum-search__icon" aria-hidden="true">›</span>
              <input v-model="search" type="search" :placeholder="copy.home.placeholder" :aria-label="copy.home.search" />
              <kbd class="gum-kbd">⌘ K</kbd>
            </div>
          </section>

          <div class="gum-stack">
            <div class="gum-tile gum-meter">
              <p class="gum-kicker">{{ copy.home.featured }}</p>
              <p class="gum-meter__value">{{ filteredPeople.length }}<span class="gum-meter__unit">people</span></p>
              <span class="gum-meter__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            </div>
            <div class="gum-tile gum-steps">
              <ol class="gum-steps__list">
                <li class="gum-steps__item">
                  <span class="gum-steps__num">01</span>
                  <div>
                    <h3 class="gum-steps__title">Find someone</h3>
                    <p class="gum-steps__text">Search an X handle and check their active campaigns.</p>
                  </div>
                </li>
                <li class="gum-steps__item">
                  <span class="gum-steps__num">02</span>
                  <div>
                    <h3 class="gum-steps__title">Pay in X Money</h3>
                    <p class="gum-steps__text">Send at least $1 directly to their X account.</p>
                  </div>
                </li>
                <li class="gum-steps__item">
                  <span class="gum-steps__num">03</span>
                  <div>
                    <h3 class="gum-steps__title">Get your share</h3>
                    <p class="gum-steps__text">Submit the receipt. Fees generated by their campaign repay supporters.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>

          <section class="gum-tile gum-tile--band">
            <h2 class="gum-band__title">{{ copy.home.featured }}</h2>
            <ol v-if="filteredPeople.length" class="gum-roster">
              <li v-for="person in filteredPeople" :key="person.handle">
                <button class="gum-person" @click="choosePerson(person)">
                  <span class="gum-person__avatar" :style="{ background: person.color }">{{ person.name.slice(0, 1) }}</span>
                  <span class="gum-person__body">
                    <span class="gum-person__handle">@{{ person.handle }} <i v-if="person.coins > 1" aria-hidden="true">✓</i></span>
                    <span class="gum-person__name">{{ person.name }}</span>
                    <em class="gum-person__bio">{{ person.bio }}</em>
                  </span>
                  <span class="gum-person__go" aria-hidden="true">↗</span>
                </button>
              </li>
            </ol>
            <p v-else class="gum-hollow">{{ copy.home.empty }}</p>
          </section>
        </div>
      </template>

      <template v-else-if="page === 'pay' && selected">
        <button class="gum-backlink" @click="navigate('/')"><span aria-hidden="true">←</span>{{ copy.common.back }}</button>

        <div class="gum-grid">
          <section class="gum-tile gum-tile--wide">
            <a :href="xUrl(selected.handle)" target="_blank" rel="noreferrer" class="gum-subject__avatar" :style="{ background: selected.color }">{{ selected.name.slice(0, 1) }}</a>
            <p class="gum-kicker">X ACCOUNT</p>
            <h1 class="gum-title gum-title--pay">{{ selected.name }}</h1>
            <a :href="xUrl(selected.handle)" target="_blank" rel="noreferrer" class="gum-subject__handle">@{{ selected.handle }} <span aria-hidden="true">↗</span></a>
            <p class="gum-lede">{{ copy.pay.subtitle }}</p>
            <div class="gum-progress">
              <span class="gum-progress__dot" :class="{ 'is-live': step === 'amount' }">1</span>
              <i class="gum-progress__rule" aria-hidden="true"></i>
              <span class="gum-progress__dot" :class="{ 'is-live': step === 'receipt' }">2</span>
              <i class="gum-progress__rule" aria-hidden="true"></i>
              <span class="gum-progress__dot" :class="{ 'is-live': step === 'success' }">3</span>
            </div>
          </section>

          <section class="gum-tile gum-tile--narrow">
            <div v-if="step === 'amount'" class="gum-fields">
              <label class="gum-field">
                <span class="gum-field__label">{{ copy.pay.amount }}</span>
                <span class="gum-money"><b>$</b><input v-model="amount" type="number" min="1" step="1" inputmode="decimal" /></span>
                <small class="gum-hint">{{ copy.pay.min }}</small>
              </label>
              <div class="gum-chips">
                <button v-for="value in [5, 25, 50, 100]" :key="value" class="gum-chip" :class="{ 'is-live': Number(amount) === value }" @click="amount = String(value)">${{ value }}</button>
              </div>
              <button class="gum-cta" @click="openPayment">{{ copy.common.continue }} <span aria-hidden="true">→</span></button>
            </div>
            <div v-else-if="step === 'receipt'" class="gum-fields">
              <label class="gum-field">
                <span class="gum-field__label">{{ copy.pay.receipt }}</span>
                <span class="gum-url">
                  <input v-model="receipt" type="url" :placeholder="copy.pay.receiptPlaceholder" />
                  <button v-if="receipt" class="gum-copy" title="Copy" @click="copyReceipt">⌘</button>
                </span>
                <small class="gum-hint">{{ copy.pay.receiptHelp }}</small>
              </label>
              <dl class="gum-audit">
                <div class="gum-audit__row">
                  <dt>{{ copy.pay.recipient }}</dt>
                  <dd>@{{ selected.handle }}</dd>
                </div>
                <div class="gum-audit__row">
                  <dt>{{ copy.pay.total }}</dt>
                  <dd>{{ formattedAmount }}</dd>
                </div>
              </dl>
              <button class="gum-cta" @click="validateReceipt">{{ copy.pay.submit }} <span aria-hidden="true">→</span></button>
            </div>
            <div v-else class="gum-fields">
              <span class="gum-seal" aria-hidden="true">✓</span>
              <h2 class="gum-band__title">{{ copy.pay.success }}</h2>
              <p class="gum-hint">{{ copy.pay.rewardHelp }}</p>
              <button class="gum-quiet" @click="navigate('/activity')">{{ copy.nav.activity }} <span aria-hidden="true">→</span></button>
            </div>
          </section>

          <section class="gum-tile gum-metrics">
            <div>
              <p class="gum-kicker">FEE POOL</p>
              <p class="gum-metric__figure">{{ selected.delivered }}</p>
              <p class="gum-note">paid to @{{ selected.handle }} so far</p>
              <span class="gum-rail" aria-hidden="true"><i :style="{ width: `${Math.min(94, selected.coins * 18 + 20)}%` }"></i></span>
              <small class="gum-hint">{{ selected.coins }} active campaigns generating fees</small>
            </div>
            <div class="gum-reward">
              <span class="gum-reward__icon" aria-hidden="true">↗</span>
              <div>
                <strong class="gum-reward__title">{{ copy.pay.reward }}</strong>
                <p class="gum-hint">{{ copy.pay.rewardHelp }}</p>
              </div>
            </div>
          </section>
        </div>
      </template>

      <template v-else-if="page === 'bounties'">
        <div class="gum-grid">
          <section class="gum-tile gum-tile--hero">
            <p class="gum-kicker">REMITIA / BOUNTIES</p>
            <h1 class="gum-title gum-title--mid">{{ copy.bounties.title }}</h1>
            <p class="gum-lede">{{ copy.bounties.lead }}</p>
          </section>

          <div class="gum-stack">
            <div class="gum-tile">
              <p class="gum-hint">{{ copy.bounties.noData }}</p>
              <span class="gum-meter__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            </div>
          </div>

          <section class="gum-tile gum-tile--band">
            <ol class="gum-roster gum-roster--single">
              <li v-for="person in people.slice(0, 4)" :key="person.handle">
                <div class="gum-person gum-person--static">
                  <span class="gum-person__avatar" :style="{ background: person.color }">{{ person.name.slice(0, 1) }}</span>
                  <span class="gum-person__body">
                    <strong class="gum-person__handle">@{{ person.handle }}</strong>
                    <small class="gum-person__meta">{{ person.coins }} active campaigns · {{ person.delivered }} delivered</small>
                  </span>
                  <button class="gum-person__action" @click="choosePerson(person)">{{ copy.common.send }} <span aria-hidden="true">→</span></button>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </template>

      <template v-else-if="page === 'activity'">
        <div class="gum-grid">
          <section class="gum-tile gum-tile--hero">
            <p class="gum-kicker">REMITIA / ACTIVITY</p>
            <h1 class="gum-title gum-title--mid">{{ copy.activity.title }}</h1>
            <p class="gum-lede">{{ payments.length }} {{ copy.activity.count }}</p>
          </section>

          <div class="gum-stack">
            <div class="gum-tile">
              <span class="gum-meter__bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
            </div>
          </div>

          <section class="gum-tile gum-tile--band">
            <ol v-if="payments.length" class="gum-log">
              <li v-for="payment in payments" :key="payment.id" class="gum-log__row">
                <span class="gum-log__icon" aria-hidden="true">↗</span>
                <div class="gum-account__body">
                  <strong class="gum-log__amount">${{ payment.amount.toFixed(2) }} to @{{ payment.handle }}</strong>
                  <small class="gum-log__time">{{ new Date(payment.time).toLocaleDateString(locale) }}</small>
                </div>
                <b class="gum-tag">{{ statusLabel(payment.status) }}</b>
              </li>
            </ol>
            <div v-else class="gum-hollow">
              <span class="gum-hollow__dot" aria-hidden="true"></span>
              <h2 class="gum-band__title">{{ copy.activity.empty }}</h2>
              <button class="gum-quiet" @click="navigate('/')">{{ copy.nav.explore }} <span aria-hidden="true">→</span></button>
            </div>
          </section>
        </div>
      </template>

      <template v-else-if="page === 'account'">
        <div class="gum-grid">
          <section class="gum-tile gum-tile--hero">
            <p class="gum-kicker">REMITIA / ACCOUNT</p>
            <h1 class="gum-title gum-title--mid">{{ copy.account.title }}</h1>
            <div class="gum-account">
              <div class="gum-account__row">
                <span class="gum-account__glyph" aria-hidden="true">𝕏</span>
                <div class="gum-account__body">
                  <strong class="gum-account__value">{{ copy.account.xSignIn }}</strong>
                  <small class="gum-account__meta">Use your X account to manage payments and limits.</small>
                </div>
                <a href="/v1/auth/x/start" class="gum-quiet">{{ copy.account.xSignIn }} <span aria-hidden="true">↗</span></a>
              </div>
              <div class="gum-account__row">
                <span class="gum-account__glyph" aria-hidden="true">◈</span>
                <div class="gum-account__body">
                  <strong class="gum-account__value">{{ wallet.connected.value ? shortAddress(walletAddress) : copy.account.noWallet }}</strong>
                  <small class="gum-account__meta">{{ wallet.connected.value ? `${walletName} · ${wallet.activeChainId.value}` : copy.account.walletHelp }}</small>
                </div>
                <button v-if="wallet.connected.value" class="gum-quiet" @click="disconnect">{{ copy.common.disconnect }}</button>
                <button v-else class="gum-cta gum-cta--compact" @click="modal = 'wallet'">{{ copy.common.connect }}</button>
              </div>
            </div>
            <p class="gum-support">{{ copy.account.supported }}</p>
          </section>

          <div class="gum-stack">
            <div class="gum-tile">
              <span class="gum-meter__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            </div>
          </div>
        </div>
      </template>
    </main>

    <nav class="gum-dock" aria-label="Main navigation">
      <button class="gum-dock__chip" :class="{ 'is-current': page === 'explore' || page === 'pay' }" @click="navigate('/')">{{ copy.nav.explore }}</button>
      <button class="gum-dock__chip" :class="{ 'is-current': page === 'bounties' }" @click="navigate('/bounties')">{{ copy.nav.bounties }}</button>
      <button class="gum-dock__chip" :class="{ 'is-current': page === 'activity' }" @click="navigate('/activity')">{{ copy.nav.activity }}<span v-if="payments.length" class="gum-dock__count">{{ payments.length }}</span></button>
      <button class="gum-dock__chip" :class="{ 'is-current': page === 'account' }" @click="navigate('/account')">{{ copy.nav.account }}</button>
    </nav>

    <footer class="gum-foot">
      <span class="gum-foot__rights">© RemitiaRH</span>
      <span class="gum-foot__motto">{{ copy.footer.tagline }}</span>
      <div class="gum-foot__links">
        <a href="/terms">{{ copy.footer.terms }}</a>
        <a href="/security">{{ copy.footer.security }}</a>
        <a href="/docs">{{ copy.footer.docs }}</a>
      </div>
      <button class="gum-foot__brand" @click="navigate('/')">
        <span class="gum-foot__badge" aria-hidden="true">R</span>
        <span class="gum-foot__word">remitia</span>
      </button>
    </footer>
  </div>

  <div v-if="modal" class="gum-veil" @click.self="modal = ''">
    <div class="gum-sheet" role="dialog" aria-modal="true" :aria-label="modal === 'wallet' ? copy.wallet.title : copy.nav.account">
      <div class="gum-sheet__bar">
        <span class="gum-sheet__rule" aria-hidden="true"></span>
        <button class="gum-sheet__close" :aria-label="copy.common.close" autofocus @click="modal = ''">×</button>
      </div>
      <template v-if="modal === 'wallet'">
        <p class="gum-sheet__badge" aria-hidden="true">◎</p>
        <h2 class="gum-sheet__title">{{ copy.wallet.title }}</h2>
        <p class="gum-sheet__copy">{{ copy.wallet.lead }}</p>
        <button class="gum-provider" @click="connect('metamask')">
          <span class="gum-provider__mark" aria-hidden="true">M</span>
          <span class="gum-provider__label">MetaMask</span>
          <small v-if="!wallet.availability?.metamask">Not detected</small>
          <b aria-hidden="true">→</b>
        </button>
        <button class="gum-provider" @click="connect('coinbase')">
          <span class="gum-provider__mark" aria-hidden="true">C</span>
          <span class="gum-provider__label">Coinbase Wallet</span>
          <small v-if="!wallet.availability?.coinbase">Not detected</small>
          <b aria-hidden="true">→</b>
        </button>
        <button v-if="wallet.availability?.ganache" class="gum-provider" @click="connect('ganache')">
          <span class="gum-provider__mark" aria-hidden="true">G</span>
          <span class="gum-provider__label">Local Ganache</span>
          <small>RPC</small>
          <b aria-hidden="true">→</b>
        </button>
        <button class="gum-provider" @click="connect('walletconnect')">
          <span class="gum-provider__mark" aria-hidden="true">W</span>
          <span class="gum-provider__label">WalletConnect</span>
          <small v-if="!wallet.availability?.walletConnect">Not configured</small>
          <b aria-hidden="true">→</b>
        </button>
        <small class="gum-sheet__hint">{{ copy.wallet.missing }}</small>
      </template>
      <template v-else>
        <p class="gum-sheet__badge" aria-hidden="true">◎</p>
        <h2 class="gum-sheet__title">{{ shortAddress(walletAddress) }}</h2>
        <p class="gum-sheet__copy">{{ walletName }} · {{ wallet.activeChainId.value }}</p>
        <button class="gum-provider gum-provider--plain" @click="navigate('/account'); modal = ''">
          <span class="gum-provider__label">{{ copy.nav.account }}</span>
          <b aria-hidden="true">→</b>
        </button>
        <button class="gum-provider gum-provider--plain" @click="disconnect">
          <span class="gum-provider__label">{{ copy.common.disconnect }}</span>
          <b aria-hidden="true">×</b>
        </button>
      </template>
    </div>
  </div>
  <div v-if="toast" class="gum-toast" role="status">{{ toast }}</div>
</template>
