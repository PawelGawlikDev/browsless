import { extensionStorage } from '@/lib/extensionStorage';
import type { RecordingState } from '@/types/migration-helpers';
import { browser } from 'wxt/browser';

const validateUrl = (str?: string | null) => str?.startsWith('http');

class RecordWorkflowUtils {
  static async updateRecording(
    callback: (recording: RecordingState) => void | Promise<void>
  ) {
    const { isRecording, recording } = (await extensionStorage.local.get([
      'isRecording',
      'recording',
    ])) as { isRecording?: boolean; recording?: RecordingState | null };

    if (!isRecording || !recording) return;

    await callback(recording);

    await extensionStorage.local.set({ recording });
  }

  static onTabCreated(tab: chrome.tabs.Tab) {
    this.updateRecording((recording) => {
      const url = tab.url || tab.pendingUrl;
      const lastFlow = recording.flows[recording.flows.length - 1];
      const invalidPrevFlow =
        lastFlow && lastFlow.id === 'new-tab' && !validateUrl(lastFlow.data.url);

      if (!invalidPrevFlow) {
        const validUrl = validateUrl(url) ? url : '';

        recording.flows.push({
          id: 'new-tab',
          data: {
            url: validUrl,
            description: tab.title || validUrl,
          },
        });
      }

      recording.activeTab = {
        url,
        id: tab.id,
      };

      extensionStorage.local.set({ recording });
    });
  }

  static async onTabsActivated({ tabId }: chrome.tabs.OnActivatedInfo) {
    const { url, id, title } = await browser.tabs.get(tabId);

    if (!validateUrl(url)) return;

    this.updateRecording((recording) => {
      recording.activeTab = { id, url };
      recording.flows.push({
        id: 'switch-tab',
        description: title,
        data: {
          url,
          matchPattern: url,
          createIfNoMatch: true,
        },
      });
    });
  }

  static onWebNavigationCommited({
    frameId,
    tabId,
    url,
    transitionType,
  }: chrome.webNavigation.WebNavigationTransitionCallbackDetails) {
    const allowedType = ['link', 'typed'];
    if (frameId !== 0 || !allowedType.includes(transitionType)) return;

    this.updateRecording((recording) => {
      if (recording.activeTab.id && tabId !== recording.activeTab.id) return;

      const lastFlow = recording.flows.at(-1);
      const isInvalidNewtabFlow =
        lastFlow && lastFlow.id === 'new-tab' && !validateUrl(lastFlow.data.url);

      if (isInvalidNewtabFlow) {
        lastFlow.data.url = url;
        lastFlow.description = url;
      } else if (validateUrl(url)) {
        if (lastFlow?.id !== 'link' || !lastFlow.isClickLink) {
          recording.flows.push({
            id: 'new-tab',
            description: url,
            data: {
              url,
              updatePrevTab: recording.activeTab.id === tabId,
            },
          });
        }

        recording.activeTab.id = tabId;
        recording.activeTab.url = url;
      }
    });
  }

  static async onWebNavigationCompleted({
    tabId,
    url,
    frameId,
  }: chrome.webNavigation.WebNavigationFramedCallbackDetails) {
    if (frameId > 0 || !url.startsWith('http')) return;

    try {
      const { isRecording } = (await extensionStorage.local.get('isRecording')) as {
        isRecording?: boolean;
      };
      if (!isRecording) return;

      await browser.scripting.executeScript({
        target: {
          tabId,
          allFrames: true,
        },
        files: ['/recordWorkflow.js'],
      });
    } catch (error) {
      console.error(error);
    }
  }
}

export default RecordWorkflowUtils;
