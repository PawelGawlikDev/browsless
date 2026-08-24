import { browser } from 'wxt/browser';
import type { SelectorQueryData, SelectorVerifyResult } from '@/types/migration-helpers';
import { isXPath, sleep, getActiveTab } from '@/utils/helper';
const makeDashboardFocus = async () => {
  const [currentTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (!currentTab?.windowId) return;
  await browser.windows.update(currentTab.windowId, {
    focused: true,
  });
};
export const initElementSelector = async (tab: chrome.tabs.Tab | null = null) => {
  let activeTab = tab;
  if (!tab) {
    activeTab = await getActiveTab();
  }
  if (!activeTab?.id || !activeTab.windowId) {
    throw new Error('active-tab-not-found');
  }
  const result = await browser.tabs.sendMessage(activeTab.id, {
    type: 'browsless-element-selector',
  });
  if (!result) {
    await browser.scripting.executeScript({
      target: {
        allFrames: true,
        tabId: activeTab.id,
      },
      files: ['/elementSelector.js'],
    });
  }
  await browser.tabs.update(activeTab.id, { active: true });
  await browser.windows.update(activeTab.windowId, { focused: true });
};
const verifySelector = async (
  data: SelectorQueryData
): Promise<SelectorVerifyResult | Record<string, unknown>> => {
  try {
    const activeTab = await getActiveTab();
    if (!activeTab?.id || !activeTab.windowId) {
      throw new Error('active-tab-not-found');
    }
    if (!data.findBy) {
      data.findBy = isXPath(data.selector) ? 'xpath' : 'cssSelector';
    }
    await browser.tabs.update(activeTab.id, { active: true });
    await browser.windows.update(activeTab.windowId, { focused: true });
    const result = await browser.tabs.sendMessage(
      activeTab.id,
      {
        data,
        isBlock: true,
        label: 'verify-selector',
      },
      { frameId: 0 }
    );
    return result;
  } catch (error) {
    console.error(error);
    await sleep(1000);
    return { notFound: true };
  } finally {
    await makeDashboardFocus();
  }
};
const selectElement = async (name = 'browsless-element-selector'): Promise<string> => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error('active-tab-not-found');
  }
  await initElementSelector(tab);
  const port = await browser.tabs.connect(tab.id, { name });
  const getSelector = () => {
    return new Promise<string>((resolve, reject) => {
      port.onDisconnect.addListener(() => {
        reject(new Error('Port closed'));
      });
      port.onMessage.addListener((message: unknown) => {
        try {
          void makeDashboardFocus();
        } catch (error) {
          console.error(error);
        } finally {
          resolve(String(message ?? ''));
        }
      });
    });
  };
  return getSelector();
};
export default {
  selectElement,
  verifySelector,
};
