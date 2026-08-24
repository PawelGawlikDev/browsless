import { nanoid } from 'nanoid';
import { messageSandbox } from './helper';
import renderString from './templating/renderString';

type WorkflowEventReferenceData = Record<string, unknown>;

type HttpRequestHeader = {
  name: string;
  value: string;
};

type HttpRequestEvent = {
  type: 'http-request';
  url: string;
  method: string;
  headers: HttpRequestHeader[];
  body: string;
};

type JavascriptCodeEvent = {
  type: 'js-code';
  code: string;
};

type WorkflowActionEvent =
  HttpRequestEvent | JavascriptCodeEvent | { type: string; [key: string]: unknown };

class WorkflowEvent {
  static async #httpRequest(
    { url, method, headers, body }: HttpRequestEvent,
    refData: WorkflowEventReferenceData
  ) {
    if (!url.trim()) return;

    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    headers.forEach((header) => {
      reqHeaders[header.name] = header.value;
    });

    const renderedBodyResult =
      method !== 'GET' ? await renderString(body, refData) : undefined;
    const renderedBody =
      renderedBodyResult && typeof renderedBodyResult !== 'string'
        ? renderedBodyResult.value
        : undefined;

    await fetch(url, {
      method,
      body:
        typeof renderedBody === 'string'
          ? renderedBody
          : renderedBody == null
            ? undefined
            : String(renderedBody),
      headers: reqHeaders,
    });
  }

  static async #javascriptCode(
    event: JavascriptCodeEvent,
    refData: WorkflowEventReferenceData
  ) {
    const instanceId = `browsless${nanoid()}`;

    await messageSandbox('javascriptBlock', {
      refData,
      instanceId,
      preloadScripts: [],
      blockData: {
        code: event.code,
      },
    });
  }

  static async handle(event: WorkflowActionEvent, refData: WorkflowEventReferenceData) {
    switch (event.type) {
      case 'http-request':
        await this.#httpRequest(event as HttpRequestEvent, refData);
        break;
      case 'js-code':
        await this.#javascriptCode(event as JavascriptCodeEvent, refData);
        break;
      default:
    }
  }
}

export default WorkflowEvent;
