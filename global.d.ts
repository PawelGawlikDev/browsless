/// <reference types="chrome" />

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S, Store> {
    storageMap?: Record<string, string>;
  }

  export interface PiniaCustomProperties {
    saveToStorage: (key?: string) => Promise<void>;
  }
}

declare global {
  interface Window {
    _browslessShortcuts?: string[];
    isBrowslessInjected?: boolean;
    initPaletteParams?: (params: unknown) => void;
    stopRecording?: (() => void) | null;
    fromBackground?: boolean;
    isDataChanged?: boolean;
  }
}

export {};
