import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
import vRemixicon from 'v-remixicon';
import App from './App.vue';
import compsUi from './compsUi';
import icons from './icons';
const additionalStyle = `.list-item-active svg { visibility: visible }`;
const initCommandPaletteApp = (rootElement: HTMLElement) => {
  const shadowRoot = rootElement.shadowRoot;
  if (!shadowRoot) return null;
  const appRoot = document.createElement('div');
  appRoot.setAttribute('id', 'app');
  const style = document.createElement('style');
  style.textContent = additionalStyle;
  shadowRoot.appendChild(style);
  shadowRoot.appendChild(appRoot);
  const app: VueApp = createApp(App);
  app
    .use(compsUi)
    .use(vRemixicon, icons)
    .provide('rootElement', rootElement)
    .mount(appRoot);
  return app;
};
export default initCommandPaletteApp;
