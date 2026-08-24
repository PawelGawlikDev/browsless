import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import { supportLocales } from '@/utils/shared';
import dayjs from './dayjs';
const localeModules = import.meta.glob<{
  default: Record<string, unknown>;
}>('../locales/*/*.json');
const supportedLocaleIds = new Set(
  (
    supportLocales as Array<{
      id: string;
    }>
  ).map(({ id }) => id)
);
const i18n = createI18n({
  legacy: false,
  fallbackLocale: 'en',
});
export const setI18nLanguage = (locale: string) => {
  i18n.global.locale.value = locale;
  document.documentElement.setAttribute('lang', locale);
};
export const loadLocaleMessages = async (locale: string, location: string) => {
  const isLocaleSupported = supportedLocaleIds.has(locale);
  if (!isLocaleSupported) {
    console.error(`${locale} locale is not supported`);
    return null;
  }
  const importLocale = async (path: string, merge = false) => {
    try {
      const importMessage = localeModules[`../locales/${locale}/${path}`];
      if (!importMessage) throw new Error(`Missing locale file: ${locale}/${path}`);
      const messages = await importMessage();
      if (merge) {
        i18n.global.mergeLocaleMessage(locale, messages.default);
      } else {
        i18n.global.setLocaleMessage(locale, messages.default);
      }
    } catch (error) {
      console.error(error);
    }
  };
  if (locale !== 'en' && !i18n.global.availableLocales.includes('en')) {
    await loadLocaleMessages('en', location);
  }
  dayjs.locale(locale);
  await importLocale('common.json');
  await importLocale('popup.json', true);
  await importLocale(`${location}.json`, true);
  await importLocale('blocks.json', true);
  return nextTick();
};
export default i18n;
