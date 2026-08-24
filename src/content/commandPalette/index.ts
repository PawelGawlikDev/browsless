import { extensionStorage } from '@/lib/extensionStorage';
import initApp from './main';
import injectAppStyles from '../injectAppStyles';
const pageLoaded = () => {
  return new Promise<void>((resolve) => {
    const checkDocState = () => {
      if (document.readyState === 'loading') {
        setTimeout(checkDocState, 1000);
        return;
      }
      resolve();
    };
    checkDocState();
  });
};
const initCommandPalette = async () => {
  try {
    const isMainFrame = window.self === window.top;
    if (!isMainFrame) return;
    const isInvalidURL = /.(json|xml)$/.test(window.location.pathname);
    if (isInvalidURL) return;
    const { browslessShortcut } = await extensionStorage.local.get('browslessShortcut');
    if (Array.isArray(browslessShortcut) && browslessShortcut.length === 0) return;
    await pageLoaded();
    const instanceExist = document.querySelector('browsless-palette');
    if (instanceExist) return;
    const element = document.createElement('div');
    const shadowRoot = element.attachShadow({ mode: 'open' });
    element.id = 'browsless-palette';
    await injectAppStyles(shadowRoot);
    initApp(element);
    document.body.appendChild(element);
  } catch (error) {
    console.error(error);
  }
};
export default initCommandPalette;
