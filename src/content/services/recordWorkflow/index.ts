import { browser } from 'wxt/browser';
import type { App as VueApp } from 'vue';
import initElementSelector from './main';
import initRecordEvents from './recordEvents';
import selectorFrameContext from '../../elementSelector/selectorFrameContext';

(async () => {
  try {
    let elementSelectorInstance: VueApp<Element> | null = null;
    const isMainFrame = window.self === window.top;
    const destroyRecordEvents = await initRecordEvents(isMainFrame);

    if (isMainFrame) {
      const element = document.querySelector('#browsless-recording');
      if (element) return;

      elementSelectorInstance = await initElementSelector();
    } else {
      const style = document.createElement('style');
      style.textContent = '[browsless-el-list] {outline: 2px dashed #6366f1;}';

      document.body.appendChild(style);

      selectorFrameContext();
    }

    browser.runtime.onMessage.addListener(function messageListener(message) {
      const { type } = message as { type?: string };

      if (type === 'recording:stop') {
        if (elementSelectorInstance) {
          elementSelectorInstance.unmount();
        }

        destroyRecordEvents();
        browser.runtime.onMessage.removeListener(messageListener);
      }
    });
  } catch (error) {
    console.error(error);
  }
})();
