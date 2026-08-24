import cronstrue from 'cronstrue';
import 'cronstrue/locales/fr';
import 'cronstrue/locales/zh_TW';
import 'cronstrue/locales/zh_CN';
const supportedLocales = ['en', 'zh', 'zh-tw', 'fr'];
const altLocaleId = {
  zh: 'zh_CN',
  'zh-TW': 'zh_TW',
};
export const readableCron = (expression: string) => {
  const currentLang = document.documentElement.lang;
  const locale = supportedLocales.includes(currentLang)
    ? altLocaleId[currentLang as keyof typeof altLocaleId] || currentLang
    : 'en';
  return cronstrue.toString(expression, { locale });
};
export default cronstrue;
