import type { MessageListenerCallback, RuntimeMessageEnvelope } from '@/types/runtime';
import { browser } from 'wxt/browser';
const nameBuilder = (prefix: string, name: string) =>
  prefix ? `${prefix}--${name}` : name;
export const sendMessage = <T = unknown, R = unknown>(
  name = '',
  data = {} as T,
  prefix = ''
) => {
  const payload: RuntimeMessageEnvelope<T> = {
    name: nameBuilder(prefix, name),
    data,
  };
  return browser.runtime.sendMessage(payload) as Promise<R>;
};
export class MessageListener {
  static sendMessage = sendMessage;
  listeners: Record<string, MessageListenerCallback>;
  prefix: string;
  constructor(prefix = '') {
    this.listeners = {};
    this.prefix = prefix;
    this.listener = this.listener.bind(this);
  }
  on<T = unknown, R = unknown>(name: string, listener: MessageListenerCallback<T, R>) {
    if (Object.hasOwn(this.listeners, name)) {
      console.error(`You already added ${name}`);
      return this.on;
    }
    this.listeners[nameBuilder(this.prefix, name)] = listener;
    return this.on;
  }
  listener(message: RuntimeMessageEnvelope, sender: chrome.runtime.MessageSender) {
    try {
      const listener = this.listeners[message.name];
      const response =
        listener && listener.call({ message, sender }, message.data, sender);
      const _prefix = message.name.split('--')[0];
      if (_prefix && _prefix !== message.name) {
        if (_prefix === this.prefix) {
          if (!response) return Promise.resolve();
          if (!(response instanceof Promise)) return Promise.resolve(response);
          return response;
        }
        return;
      }
      if (!response) return Promise.resolve();
      if (!(response instanceof Promise)) return Promise.resolve(response);
      return response;
    } catch (err) {
      return Promise.reject(new Error(`Unhandled Background Error: ${String(err)}`));
    }
  }
  /**
   *
   * @param {string} name
   * @param {*} data
   *
   * @returns {Promise<*>}
   */
  sendMessage<T = unknown, R = unknown>(name: string, data?: T) {
    return sendMessage<T, R>(name, data, this.prefix);
  }
}
