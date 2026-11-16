import { computed, ref, watch } from "vue";

export const supportedLocales = Object.freeze([
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "zh-CN", label: "Chinese", nativeLabel: "简体中文" },
  { code: "ja-JP", label: "Japanese", nativeLabel: "日本語" },
  { code: "ko-KR", label: "Korean", nativeLabel: "한국어" },
]);

const messages = {
  en: { language: "Language" },
  "zh-CN": { language: "语言" },
  "ja-JP": { language: "言語" },
  "ko-KR": { language: "언어" },
};

const locale = ref(resolveInitialLocale());
function resolveInitialLocale() {
  if (typeof window !== "undefined") {
    try { const saved = window.localStorage?.getItem("remitia.locale"); if (supportedLocales.some((item) => item.code === saved)) return saved; } catch { /* private mode */ }
  }
  return "en";
}
function translate(key) { return messages[locale.value]?.[key] || messages.en[key] || key; }
export function setLocale(nextLocale) { if (!supportedLocales.some((item) => item.code === nextLocale)) return false; locale.value = nextLocale; return true; }
export function useI18n() { return { locale, locales: supportedLocales, currentLocale: computed(() => supportedLocales.find((item) => item.code === locale.value)), t: translate, setLocale }; }
export function installI18n(app) { app.config.globalProperties.$t = translate; app.provide("i18n", { locale, locales: supportedLocales, t: translate, setLocale }); watch(locale, (next) => { try { window.localStorage?.setItem("remitia.locale", next); } catch { /* private mode */ } if (typeof document !== "undefined") document.documentElement.lang = next; }, { immediate: true }); }
export { messages };
