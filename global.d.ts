/// <reference types="chrome" />

declare module 'pinia' {
  export interface DefineStoreOptions<_Id, _S, _G, _A> {
    storageMap?: Record<string, string>;
  }

  export interface DefineStoreOptionsBase<_S, _Store> {
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
  }
}

export {};
