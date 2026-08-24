import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
import vRemixicon from 'v-remixicon';
import App from './App.vue';
import compsUi from './compsUi';
import icons from './icons';
import vueI18n from './vueI18n';
import '@/assets/css/tailwind.css';
const initElementSelectorApp = (rootElement: HTMLElement) => {
  const shadowRoot = rootElement.shadowRoot;
  if (!shadowRoot) return null;
  const appRoot = document.createElement('div');
  appRoot.setAttribute('id', 'app');
  shadowRoot.appendChild(appRoot);
  const app: VueApp = createApp(App);
  app
    .provide('rootElement', rootElement)
    .use(vueI18n)
    .use(vRemixicon, icons)
    .use(compsUi)
    .mount(appRoot);
  return app;
};
export default initElementSelectorApp;
