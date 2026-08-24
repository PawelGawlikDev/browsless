import { isWhitespace } from '@/utils/helper';
import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';

type ProxyBlockData = {
  clearProxy?: boolean;
  scheme?: string;
  bypassList?: string;
  host?: string;
  port?: number | string;
};

function setProxy(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<ProxyBlockData>
) {
  const nextBlockId = this.getBlockConnections(id);

  return new Promise<WorkflowBlockResult>((resolve, reject) => {
    if (data.clearProxy) {
      BrowserAPIService.proxy.settings.clear({});
    }

    const config: chrome.proxy.ProxyConfig = {
      mode: 'fixed_servers',
      rules: {
        singleProxy: {
          scheme: data.scheme as chrome.proxy.ProxyServer['scheme'],
          host: '',
        },
        bypassList: isWhitespace(data.bypassList)
          ? []
          : (data.bypassList ?? '').split(','),
      },
    };

    let proxyPort = data.port;

    if (!isWhitespace(data.host)) {
      let proxyHost: string | undefined = data.host;

      const schemeRegex = /^https?|socks4|socks5/i;
      if (data.host && schemeRegex.test(data.host)) {
        let [scheme, host] = data.host.split(/:\/\/(.*)/);

        if (host?.includes(':')) {
          [host, proxyPort] = host.split(':') as [string, string];
        }

        proxyHost = host;
        config.rules.singleProxy!.scheme = scheme as chrome.proxy.ProxyServer['scheme'];
      }

      config.rules.singleProxy!.host = proxyHost as string;
    } else {
      if (data.clearProxy) {
        this.engine.isUsingProxy = false;

        resolve({
          data: '',
          nextBlockId,
        });

        return;
      }

      const error = Object.assign(new Error('invalid-proxy-host'), { nextBlockId });

      reject(error);
      return;
    }

    if (proxyPort && !Number.isNaN(+proxyPort)) {
      config.rules.singleProxy!.port = +proxyPort;
    }
    BrowserAPIService.proxy.settings.set({ value: config, scope: 'regular' }).then(() => {
      this.engine.isUsingProxy = true;

      resolve({
        data: data.host,
        nextBlockId,
      });
    });
  });
}

export default setProxy;
