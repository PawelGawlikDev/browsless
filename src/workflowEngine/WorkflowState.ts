import BrowserAPIService from '@/service/browser-api/BrowserAPIService';

type WorkflowStateStorage = {
  get: (key: string) => Promise<Record<string, unknown> | Map<string, unknown> | unknown>;
  set: (key: string, value: Record<string, unknown>) => Promise<unknown>;
};

type WorkflowStateEntry = Record<string, unknown> & {
  status?: string;
  isDestroyed?: boolean;
};

type WorkflowStateListener = (params: unknown) => void;

class WorkflowState {
  key: string;
  storage: WorkflowStateStorage;
  states: Map<string, WorkflowStateEntry>;
  eventListeners: Record<string, WorkflowStateListener[]>;
  storageTimeout: ReturnType<typeof setTimeout> | null;

  constructor({
    storage,
    key = 'workflowState',
  }: {
    storage: WorkflowStateStorage;
    key?: string;
  }) {
    this.key = key;
    this.storage = storage;

    this.states = new Map();
    this.eventListeners = {};

    this.storageTimeout = null;
  }

  _updateBadge() {
    BrowserAPIService.browserAction.setBadgeText({
      text: (this.states.size || '').toString(),
    });
  }

  _saveToStorage() {
    if (this.storageTimeout) return;

    this.storageTimeout = setTimeout(() => {
      this.storageTimeout = null;

      const states = Object.fromEntries(this.states);
      this.storage.set(this.key, states);
    }, 1000);
  }

  dispatchEvent(name: string, params: unknown) {
    const listeners = this.eventListeners[name];

    if (!listeners) return;

    listeners.forEach((callback) => {
      callback(params);
    });
  }

  on(name: string, listener: WorkflowStateListener) {
    (this.eventListeners[name] = this.eventListeners[name] || []).push(listener);
  }

  off(name: string, listener: WorkflowStateListener) {
    const listeners = this.eventListeners[name];
    if (!listeners) return;

    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  }

  get getAll() {
    return this.states;
  }

  async get(stateId?: string | ((state: WorkflowStateEntry) => boolean)) {
    let states:
      | Map<string, WorkflowStateEntry>
      | WorkflowStateEntry
      | [string, WorkflowStateEntry]
      | undefined = this.states;

    if (typeof stateId === 'function') {
      states = Array.from(this.states.entries()).find(([, state]) => stateId(state));
    } else if (stateId) {
      states = this.states.get(stateId);
    }

    return states;
  }

  async add(id: string, data: WorkflowStateEntry = {}) {
    this.states.set(id, data);
    this._updateBadge();
    this._saveToStorage();
  }

  async stop(id: string) {
    const isStateExist = await this.get(id);
    if (!isStateExist) {
      await this.delete(id);
      this.dispatchEvent('stop', id);
      return id;
    }

    await this.update(id, { isDestroyed: true });
    this.dispatchEvent('stop', id);
    return id;
  }

  async resume(id: string, nextBlock: unknown) {
    const state = this.states.get(id);
    if (!state) return;

    this.states.set(id, {
      ...state,
      status: 'running',
    });
    this._saveToStorage();

    this.dispatchEvent('resume', { id, nextBlock });
  }

  async update(id: string, data: WorkflowStateEntry = {}) {
    const state = this.states.get(id);
    if (!state) return;

    const statePayload = data.state as { status?: string } | undefined;
    if (statePayload?.status) {
      state.status = statePayload.status;
      delete statePayload.status;
    }

    this.states.set(id, { ...state, ...data });
    this.dispatchEvent('update', { id, data });
    this._saveToStorage();
  }

  async delete(id: string) {
    this.states.delete(id);
    this.dispatchEvent('delete', id);
    this._updateBadge();
    this._saveToStorage();
  }
}

export default WorkflowState;
