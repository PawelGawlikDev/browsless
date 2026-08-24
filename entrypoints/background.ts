import initBackground from '../src/background/index';

export default defineBackground({
  type: 'module',
  main() {
    const backgroundGlobal = globalThis as typeof globalThis & {
      window?: Window & typeof globalThis;
    };

    if (!backgroundGlobal.window) {
      backgroundGlobal.window = globalThis as Window & typeof globalThis;
    }

    initBackground();
  },
});
