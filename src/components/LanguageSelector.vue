<script setup>
import { useI18n } from "../i18n";

const { locale, locales, setLocale, t } = useI18n();

function changeLocale(event) {
  setLocale(event.target.value);
}
</script>

<template>
  <label class="ledger-lang">
    <span class="ledger-lang__word">{{ t("language") }}</span>
    <span class="ledger-lang__glyph" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">
        <circle cx="8" cy="8" r="6.1" />
        <path d="M1.9 8h12.2M8 1.9c1.85 1.95 2.75 4 2.75 6.1S9.85 12.15 8 14.1C6.15 12.15 5.25 10.1 5.25 8S6.15 3.85 8 1.9Z" />
      </svg>
    </span>
    <select :value="locale" :aria-label="t('language')" @change="changeLocale">
      <option v-for="item in locales" :key="item.code" :value="item.code">
        {{ item.nativeLabel }}
      </option>
    </select>
  </label>
</template>
