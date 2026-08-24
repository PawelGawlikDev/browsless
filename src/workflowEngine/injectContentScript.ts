import { browser } from 'wxt/browser';
const contentScriptExist = async (tabId: number, frameId = 0) => {
  try {
    await browser.tabs.sendMessage(tabId, { type: 'content-script-exists' }, { frameId });
    return true;
  } catch {
    return false;
  }
};
export default function (tabId: number, frameId = 0) {
  return new Promise<boolean>((resolve) => {
    const currentFrameId = typeof frameId !== 'number' ? 0 : frameId;
    let tryCount = 0;
    (async function tryExecute() {
      try {
        if (tryCount > 3) {
          resolve(false);
          return;
        }
        tryCount += 1;
        await browser.scripting.executeScript({
          target: {
            tabId,
            allFrames: true,
          },
          injectImmediately: true,
          files: ['/contentScript.js'],
        });
        const isScriptExists = await contentScriptExist(tabId, currentFrameId);
        if (isScriptExists) {
          resolve(true);
        } else {
          setTimeout(tryExecute, 1000);
        }
      } catch (error) {
        console.error(error);
        setTimeout(tryExecute, 1000);
      }
    })();
  });
}
