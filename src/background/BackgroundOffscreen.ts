import { sleep } from '@/utils/helper';
import { MessageListener } from '@/utils/message';
import { browser as Browser } from 'wxt/browser';

const OFFSCREEN_URL = Browser.runtime.getURL('/offscreen.html');

class BackgroundOffscreen {
  static #_instance: BackgroundOffscreen | undefined;

  on: MessageListener['on'];

  /**
   * OffscreenService singleton
   * @returns {BackgroundOffscreen}
   */
  static get instance() {
    if (!this.#_instance) {
      this.#_instance = new BackgroundOffscreen();
    }

    return this.#_instance;
  }

  #messageListener: MessageListener;

  constructor() {
    this.#messageListener = new MessageListener('offscreen');

    this.on = this.#messageListener.on;
  }

  /**
   *
   * @returns {Promise<boolean>}
   */
  async #ensureDocument(): Promise<void> {
    const isOpened = await this.isOpened();
    if (isOpened) return;

    await chrome.offscreen.createDocument({
      url: OFFSCREEN_URL,
      reasons: [
        chrome.offscreen.Reason.BLOBS,
        chrome.offscreen.Reason.CLIPBOARD,
        chrome.offscreen.Reason.IFRAME_SCRIPTING,
      ],
      justification: 'For running the workflow',
    });

    await sleep(500);
  }

  /**
   *
   * @returns {Promise<boolean>}
   */
  async isOpened(): Promise<boolean> {
    const contexts = await chrome.runtime.getContexts({
      documentUrls: [OFFSCREEN_URL],
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });

    return Boolean(contexts.length);
  }

  /**
   *
   * @param {string} name
   * @param {*} data
   * @returns {Promise<*>}
   */
  async sendMessage<T = unknown, R = unknown>(name: string, data?: T): Promise<R> {
    await this.#ensureDocument();

    return this.#messageListener.sendMessage<T | undefined, R>(name, data);
  }
}

export default BackgroundOffscreen;
