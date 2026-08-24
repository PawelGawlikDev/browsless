import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

const { default: tailwindcss } = await import('@tailwindcss/vite');

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  modules: ['@wxt-dev/module-vue', '@wxt-dev/auto-icons'],
  srcDir: 'src',
  entrypointsDir: '../entrypoints',
  manifest: ({ mode }) => ({
    name: mode === 'development' ? 'BrowsLess-Dev' : 'BrowsLess',
    description: 'An extension for automating your browser by connecting blocks',
    minimum_chrome_version: '116',
    commands: {
      'open-dashboard': {
        suggested_key: {
          default: 'Alt+A',
          mac: 'Alt+A',
        },
        description: 'Open the dashboard',
      },
      'element-picker': {
        suggested_key: {
          default: 'Alt+P',
          mac: 'Alt+P',
        },
        description: 'Open element picker',
      },
    },
    host_permissions: ['<all_urls>'],
    optional_permissions: [
      'cookies',
      'downloads',
      'contextMenus',
      'clipboardRead',
      'notifications',
    ],
    permissions: [
      'tabs',
      'proxy',
      'alarms',
      'storage',
      'debugger',
      'activeTab',
      'offscreen',
      'webNavigation',
      'unlimitedStorage',
      'scripting',
    ],
    web_accessible_resources: [
      {
        resources: ['/*.js', '/*.css', '/assets/*', '/fonts/*'],
        matches: ['*://*/*'],
      },
    ],
    sandbox: {
      pages: ['/sandbox.html'],
    },
  }),
  vite: () => ({
    plugins: [tailwindcss()],
    server: {
      cors: true,
    },
    resolve: {
      alias: [
        {
          find: /^@\//,
          replacement: `${path.resolve(rootDir, 'src')}/`,
        },
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
    build: {
      modulePreload: false,
    },
  }),
});
