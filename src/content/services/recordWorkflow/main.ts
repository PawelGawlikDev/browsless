import { createApp } from 'vue';
import type { App as VueApp } from 'vue';
import vRemixicon from 'v-remixicon';
import App from './App.vue';
import icons from './icons';
import injectAppStyles from '../../injectAppStyles';
const customCSS = `
  #app {
    font-family: 'Inter var';
    line-height: 1.5;
  }
  .content {
    width: 250px;
  }
`;
const initRecordWorkflowApp = () => {
  const rootElement = document.createElement('div');
  const shadowRoot = rootElement.attachShadow({ mode: 'open' });
  rootElement.setAttribute('id', 'browsless-recording');
  rootElement.classList.add('browsless-element-selector');
  document.body.appendChild(rootElement);
  return injectAppStyles(shadowRoot, customCSS).then(() => {
    const appRoot = document.createElement('div');
    appRoot.setAttribute('id', 'app');
    shadowRoot.appendChild(appRoot);
    const app: VueApp = createApp(App).use(vRemixicon, icons);
    app.mount(appRoot);
    return app;
  });
};
export default initRecordWorkflowApp;
