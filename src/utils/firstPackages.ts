import type { Position } from '@/types/models';
import type { StarterPackage } from '@/types/migration-helpers';
import type { SharedBlocksMap } from '@/types/shared-data';
import { tasks } from '@/utils/shared';
const sharedTasks = tasks as SharedBlocksMap;
const clone = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};
const block = (
  id: string,
  label: string,
  position: Position,
  data: Record<string, unknown> = {}
) => {
  const task = sharedTasks[label];
  return {
    id,
    label,
    position,
    type: task.component ?? '',
    data: { ...clone(task.data ?? {}), ...data },
  };
};
const outputHandle = (id: string, handle = 1) => {
  return `${id}-output-${handle}`;
};
const starterPackages: StarterPackage[] = [
  {
    id: 'starter-wait-for-page-ready',
    name: 'Wait for page ready',
    description: 'Waits for the current tab to finish loading before continuing.',
    icon: 'riTimerLine',
    isExtenal: false,
    content: null,
    inputs: [{ id: 'start', name: 'Start', blockId: 'wait-loaded' }],
    outputs: [
      {
        id: 'ready',
        name: 'Ready',
        blockId: 'wait-loaded',
        handleId: outputHandle('wait-loaded'),
      },
    ],
    variable: [],
    settings: {
      asBlock: true,
    },
    data: {
      nodes: [
        block(
          'wait-loaded',
          'browser-event',
          { x: 80, y: 80 },
          {
            description: 'Wait for tab loaded',
            eventName: 'tab:loaded',
            setAsActiveTab: true,
            activeTabLoaded: true,
            tabLoadedUrl: '',
            tabUrl: '',
            fileQuery: '',
            timeout: 15000,
          }
        ),
      ],
      edges: [],
    },
  },
  {
    id: 'starter-extract-links',
    name: 'Extract links',
    description: 'Collects page links into the `dataset` variable.',
    icon: 'riLinksLine',
    isExtenal: false,
    content: null,
    inputs: [{ id: 'start', name: 'Start', blockId: 'extract-links' }],
    outputs: [
      {
        id: 'done',
        name: 'Done',
        blockId: 'extract-links',
        handleId: outputHandle('extract-links'),
      },
    ],
    variable: [],
    settings: {
      asBlock: true,
    },
    data: {
      nodes: [
        block(
          'extract-links',
          'javascript-code',
          { x: 80, y: 80 },
          {
            description: 'Collect visible links',
            code: `const links = [...document.querySelectorAll('a[href]')]
  .map((link) => ({
    text: (link.textContent || '').trim(),
    url: link.href,
  }))
  .filter((link) => link.url && link.text)
  .slice(0, 50);

browslessSetVariable('dataset', links);
browslessNextBlock();`,
            timeout: 20000,
            context: 'website',
            everyNewTab: false,
            runBeforeLoad: false,
            preloadScripts: [],
          }
        ),
      ],
      edges: [],
    },
  },
  {
    id: 'starter-download-json',
    name: 'Download JSON',
    description: 'Downloads the `dataset` variable as a JSON file.',
    icon: 'riDownloadLine',
    isExtenal: false,
    content: null,
    inputs: [{ id: 'start', name: 'Start', blockId: 'download-json' }],
    outputs: [
      {
        id: 'done',
        name: 'Done',
        blockId: 'download-json',
        handleId: outputHandle('download-json'),
      },
    ],
    variable: [],
    settings: {
      asBlock: true,
    },
    data: {
      nodes: [
        block(
          'download-json',
          'export-data',
          { x: 80, y: 80 },
          {
            description: 'Download dataset as JSON',
            name: 'browsless-export',
            type: 'json',
            variableName: 'dataset',
            dataToExport: 'variable',
            addBOMHeader: false,
            onConflict: 'uniquify',
          }
        ),
      ],
      edges: [],
    },
  },
];
export const getStarterPackageById = (id: string) => {
  const pkg = starterPackages.find((item) => item.id === id);
  return pkg ? clone(pkg) : null;
};
export default starterPackages;
