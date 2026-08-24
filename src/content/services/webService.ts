import { extensionStorage } from '@/lib/extensionStorage';
import { objectHasKey, parseJSON } from '@/utils/helper';
import { sendMessage } from '@/utils/message';
import { openDB } from 'idb';
import { nanoid } from 'nanoid';
import { getExtensionManifest } from '@/utils/extensionManifest';
type WebListener = {
  on: (name: string, callback: (data: never) => void) => void;
};
const initWebListener = (): WebListener => {
  const listeners: Record<string, Array<(data: unknown) => void>> = {};
  const on = (name: string, callback: (data: never) => void) => {
    (listeners[name] = listeners[name] || []).push(callback as (data: unknown) => void);
  };
  window.addEventListener('__browsless-ext__', (({ detail }: CustomEventInit) => {
    if (
      !detail ||
      !objectHasKey(
        listeners,
        (
          detail as {
            type?: string;
          }
        ).type
      )
    )
      return;
    const eventDetail = detail as {
      type: string;
      data: unknown;
    };
    listeners[eventDetail.type].forEach((listener) => {
      listener(eventDetail.data);
    });
  }) as EventListener);
  return { on };
};
const sendMessageBack = (type: string, payload: unknown = {}) => {
  const event = new CustomEvent(`__browsless-ext__${type}`, {
    detail: payload,
  });
  window.dispatchEvent(event);
};
type StoredWorkflow = Record<string, any> & {
  id?: string;
};
type StoredPackage = Record<string, any> & {
  id?: string;
};
window.addEventListener('DOMContentLoaded', async () => {
  try {
    document.body.setAttribute('data-atm-ext-installed', getExtensionManifest().version);
    const storedWorkflows = (await extensionStorage.local.get('workflows')) as {
      workflows?: Record<string, StoredWorkflow> | StoredWorkflow[];
    };
    const db = await openDB('browsless', 1, {
      upgrade(event) {
        event.createObjectStore('store');
      },
    });
    await db.put('store', storedWorkflows.workflows, 'workflows');
    const webListener = initWebListener();
    webListener.on('open-dashboard', ({ path }: { path?: string }) => {
      if (!path) return;
      sendMessage('open:dashboard', path, 'background');
    });
    webListener.on('open-workflow', ({ workflowId }: { workflowId?: string }) => {
      if (!workflowId) return;
      sendMessage('open:dashboard', `/workflows/${workflowId}`, 'background');
    });
    webListener.on('add-workflow', async ({ workflow }: { workflow: StoredWorkflow }) => {
      try {
        const { workflows: workflowsStorage } = (await extensionStorage.local.get(
          'workflows'
        )) as {
          workflows?: Record<string, StoredWorkflow> | StoredWorkflow[];
        };
        if (!workflowsStorage) return;
        const workflowId = nanoid();
        const workflowData: StoredWorkflow = {
          ...workflow,
          id: workflowId,
          dataColumns: [],
          createdAt: Date.now(),
          table: (workflow as any).table || (workflow as any).dataColumns,
        };
        (workflowData as any).drawflow =
          typeof workflowData.drawflow === 'string'
            ? parseJSON(workflowData.drawflow, workflowData.drawflow)
            : workflowData.drawflow;
        if (Array.isArray(workflowsStorage)) {
          workflowsStorage.push(workflowData);
        } else {
          workflowsStorage[workflowId] = workflowData;
        }
        await extensionStorage.local.set({ workflows: workflowsStorage });
        sendMessage('workflow:added', { workflowId, workflowData }, 'background');
      } catch (error) {
        console.error(error);
      }
    });
    webListener.on('add-package', async (data: { package: StoredPackage }) => {
      try {
        const { savedBlocks } = (await extensionStorage.local.get('savedBlocks')) as {
          savedBlocks?: StoredPackage[];
        };
        const packages: StoredPackage[] = savedBlocks || [];
        packages.push({ ...data.package, createdAt: Date.now() });
        await extensionStorage.local.set({ savedBlocks: packages });
        sendMessage('dashboard:refresh-packages', '', 'background');
      } catch (error) {
        console.error(error);
      }
    });
    webListener.on(
      'update-package',
      async (data: { id?: string; package: Partial<StoredPackage> }) => {
        const { savedBlocks } = (await extensionStorage.local.get('savedBlocks')) as {
          savedBlocks?: StoredPackage[];
        };
        const packages: StoredPackage[] = savedBlocks || [];
        const index = packages.findIndex((pkg) => pkg.id === data.id);
        if (index === -1) return;
        Object.assign(packages[index], data.package);
        await extensionStorage.local.set({ savedBlocks: packages });
        sendMessage('dashboard:refresh-packages', '', 'background');
      }
    );
    webListener.on(
      'send-message',
      async ({ type, data }: { type: string; data?: unknown }) => {
        if (type === 'package-installed') {
          const { savedBlocks } = (await extensionStorage.local.get('savedBlocks')) as {
            savedBlocks?: StoredPackage[];
          };
          const packages: StoredPackage[] = savedBlocks || [];
          const isInstalled = packages.some((pkg) => pkg.id === data);
          sendMessageBack(type, isInstalled);
        } else if (type === 'get-workflows') {
          const storage = (await extensionStorage.local.get('workflows')) as {
            workflows?: unknown;
          };
          sendMessageBack(type, storage.workflows);
        }
      }
    );
  } catch (error) {
    console.error(error);
  }
});
window.addEventListener('user-logout', () => {
  extensionStorage.local.remove(['session', 'sessionToken']);
});
type SupabaseSessionUser = {
  id?: string;
  user_metadata?: {
    iss?: string;
  };
} & Record<string, any>;
type SupabaseAuthSession = {
  user?: SupabaseSessionUser;
  provider_token?: string;
  provider_refresh_token?: string;
} & Record<string, any>;
window.addEventListener('app-mounted', async () => {
  try {
    const STORAGE_KEY = 'supabase.auth.token';
    const webStorageAuthData = parseJSON<SupabaseAuthSession | null>(
      localStorage.getItem(STORAGE_KEY),
      null
    );
    const extensionSession = (await extensionStorage.local.get([
      'session',
      'sessionToken',
    ])) as {
      session?: SupabaseAuthSession;
      sessionToken?: {
        access: string;
        refresh: string;
      };
    };
    const setUserSession = async () => {
      const saveToStorage: Record<string, unknown> = {
        session: webStorageAuthData,
      };
      const isGoogleProvider =
        webStorageAuthData?.user?.user_metadata?.iss?.includes('google.com') ?? false;
      const { session: currSession, sessionToken: currSessionToken } =
        (await extensionStorage.local.get(['session', 'sessionToken'])) as {
          session?: SupabaseAuthSession;
          sessionToken?: {
            access: string;
            refresh: string;
          };
        };
      if (
        isGoogleProvider &&
        ((webStorageAuthData && webStorageAuthData.user?.id === currSession?.user?.id) ||
          !currSessionToken)
      ) {
        saveToStorage.sessionToken = {
          access: webStorageAuthData?.provider_token,
          refresh: webStorageAuthData?.provider_refresh_token,
        };
      }
      if (!isGoogleProvider) {
        extensionStorage.local.remove('sessionToken');
      }
      await extensionStorage.local.set(saveToStorage);
    };
    if (webStorageAuthData && !extensionSession.session) {
      await setUserSession();
    } else if (webStorageAuthData && extensionSession.session) {
      if (webStorageAuthData.user?.id !== extensionSession.session.user?.id) {
        await setUserSession();
      } else {
        const currentSession = { ...extensionSession.session };
        if (extensionSession.sessionToken) {
          currentSession.provider_token = extensionSession.sessionToken.access;
          currentSession.provider_refresh_token = extensionSession.sessionToken.refresh;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
      }
    }
  } catch (error) {
    console.error(error);
  }
});
