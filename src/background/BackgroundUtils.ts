import { browser } from 'wxt/browser';
import { waitTabLoaded } from '@/workflowEngine/helper';

class BackgroundUtils {
  static async openDashboard(url = '', updateTab = true) {
    const tabUrl = browser.runtime.getURL(
      `/dashboard.html#${typeof url === 'string' ? url : ''}`
    );

    try {
      const [tab] = await browser.tabs.query({
        url: browser.runtime.getURL('/dashboard.html'),
      });

      if (tab) {
        const tabOptions: chrome.tabs.UpdateProperties = { active: true };
        if (updateTab) tabOptions.url = tabUrl;

        if (typeof tab.id === 'number') {
          await browser.tabs.update(tab.id, tabOptions);
        }

        if (updateTab) {
          await browser.windows.update(tab.windowId, {
            focused: true,
            state: 'maximized',
          });
        }
      } else {
        const curWin = await browser.windows.getCurrent();
        const windowOptions: chrome.windows.CreateData = {
          top: 0,
          left: 0,
          width: Math.min(curWin.width || 715, 715),
          height: Math.min(curWin.height || 715, 715),
          url: tabUrl,
          type: 'popup',
        };

        if (updateTab) {
          windowOptions.focused = true;
        }

        await browser.windows.create(windowOptions);
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  static async sendMessageToDashboard(type, data) {
    const [tab] = await browser.tabs.query({
      url: browser.runtime.getURL('/dashboard.html'),
    });

    if (typeof tab?.id !== 'number') return null;

    await waitTabLoaded({ tabId: tab.id });
    const result = await browser.tabs.sendMessage(tab.id, { type, data });

    return result;
  }
}

export default BackgroundUtils;
