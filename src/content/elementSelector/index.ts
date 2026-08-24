import { elementSelectorInstance } from '../utils';
import initElementSelector from './main';
import injectAppStyles from '../injectAppStyles';
import selectorFrameContext from './selectorFrameContext';

(async function () {
  try {
    const isMainFrame = window.self === window.top;

    if (isMainFrame) {
      const isAppExists = elementSelectorInstance();
      if (isAppExists) return;

      const rootElement = document.createElement('div');
      rootElement.setAttribute('id', 'app-container');
      rootElement.classList.add('browsless-element-selector');
      const shadowRoot = rootElement.attachShadow({ mode: 'open' });

      initElementSelector(rootElement);
      await injectAppStyles(shadowRoot);

      document.documentElement.appendChild(rootElement);
    } else {
      const style = document.createElement('style');
      style.textContent = '[browsless-el-list] {outline: 2px dashed #6366f1;}';

      document.body.appendChild(style);

      selectorFrameContext();
    }
  } catch (error) {
    console.error(error);
  }
})();
