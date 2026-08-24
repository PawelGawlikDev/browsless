import { browser } from 'wxt/browser';
type ExtensionManifest = ReturnType<typeof browser.runtime.getManifest> & {
  manifest_version: number;
  version: string;
};
export const getExtensionManifest = (): ExtensionManifest => {
  const manifest =
    browser?.runtime?.getManifest?.() || globalThis.chrome?.runtime?.getManifest?.();
  return (
    manifest ||
    ({
      manifest_version: 3,
      version: '0.0.0',
    } as ExtensionManifest)
  );
};
