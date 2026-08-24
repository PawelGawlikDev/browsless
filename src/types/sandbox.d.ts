export {};

declare global {
  interface Window {
    $getNestedProperties: (obj: unknown, path: string) => unknown;
    [key: `browsless${string}`]: unknown;
  }

  namespace chrome {
    namespace dom {
      function openOrClosedShadowRoot(element: Element): ShadowRoot | null;
    }
  }
}
