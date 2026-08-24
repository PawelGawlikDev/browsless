import { browser } from 'wxt/browser';
type RuntimeAssetPath = Parameters<typeof browser.runtime.getURL>[0];
export const generateStyleEl = (css: string, classes = true) => {
  const style = document.createElement('style');
  style.textContent = css;
  if (classes) {
    style.classList.add('browsless-element-selector');
  }
  return style;
};
const fetchFirstAvailable = async (urls: string[]) => {
  for (const url of urls) {
    const response = await fetch(url).catch(() => null);
    if (response?.ok) return response;
  }
  throw new Error(`Failed to load styles from: ${urls.join(', ')}`);
};
const injectAppStyles = async (appRoot: ShadowRoot, customCss = '') => {
  try {
    const response = await fetchFirstAvailable([
      browser.runtime.getURL('/assets/elementSelectorStyles.css' as RuntimeAssetPath),
      browser.runtime.getURL('/elementSelectorStyles.css' as RuntimeAssetPath),
    ]);
    const mainCSS = await response.text();
    const appStyleEl = generateStyleEl(mainCSS + customCss, false);
    appRoot.appendChild(appStyleEl);
    const fontStyleExists = document.head.querySelector('.browsless-element-selector');
    if (!fontStyleExists) {
      const commonCSS =
        '\n.browsless-element-selector { direction: ltr } \n [browsless-isDragging] { user-select: none } \n [browsless-el-list] {outline: 2px dashed #6366f1;}';
      const fontURL = browser.runtime.getURL(
        '/fonts/Inter-roman-latin.var.woff2' as RuntimeAssetPath
      );
      const fontCSS = `@font-face { font-family: "Inter var"; font-weight: 100 900; font-display: swap; font-style: normal; font-named-instance: "Regular"; src: url("${fontURL}") format("woff2") }`;
      const fontStyleEl = generateStyleEl(fontCSS + commonCSS);
      document.head.appendChild(fontStyleEl);
    }
  } catch (error) {
    console.error(error);
  }
};
export default injectAppStyles;
