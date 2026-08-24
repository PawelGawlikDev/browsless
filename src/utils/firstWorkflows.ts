import type { Position, Workflow, WorkflowEdge } from '@/types/models';
import type { SharedBlocksMap } from '@/types/shared-data';
import type { StarterPackage } from '@/types/migration-helpers';
import { tasks } from '@/utils/shared';
import { nanoid } from 'nanoid';
import { getStarterPackageById } from '@/utils/firstPackages';
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
const packageBlock = (id: string, position: Position, pkg: StarterPackage | null) => {
  return {
    id,
    label: 'block-package',
    position,
    type: 'BlockPackage',
    data: clone(pkg ?? {}),
  };
};
const inputHandle = (id: string, handle = 1) => {
  return `${id}-input-${handle}`;
};
const outputHandle = (id: string, handle = 1) => {
  return `${id}-output-${handle}`;
};
const packageInputHandle = (id: string, inputId: string) => {
  return `${id}-input-${inputId}`;
};
const packageOutputHandle = (id: string, outputId: string) => {
  return `${id}-output-${outputId}`;
};
const edge = (
  source: string,
  target: string,
  options: Partial<WorkflowEdge> = {}
): WorkflowEdge => {
  return {
    id: options.id || `${source}-${target}-${Math.random().toString(36).slice(2, 8)}`,
    source,
    target,
    sourceHandle: options.sourceHandle || outputHandle(source),
    targetHandle: options.targetHandle || inputHandle(target),
    type: options.type || 'default',
    markerEnd: 'arrowclosed',
  };
};
const manualTriggerData = (overrides: Record<string, unknown> = {}) => {
  return {
    ...clone(sharedTasks.trigger?.data ?? {}),
    type: 'manual',
    ...overrides,
  };
};
const autofillDemoPage = `data:text/html;charset=utf-8,${encodeURIComponent(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Browsless Demo Form</title>
    <style>
      body { font-family: Inter, Arial, sans-serif; margin: 0; background: #0f172a; color: #e2e8f0; }
      .wrap { max-width: 720px; margin: 40px auto; padding: 32px; background: #111827; border-radius: 24px; }
      h1 { margin-top: 0; }
      label { display: block; margin: 16px 0 8px; }
      input, textarea, select { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid #334155; background: #020617; color: white; box-sizing: border-box; }
      textarea { min-height: 120px; resize: vertical; }
      .row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .checkbox { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
      .checkbox input { width: auto; }
      button { margin-top: 20px; padding: 14px 18px; border: 0; border-radius: 12px; background: #8b5cf6; color: white; font-weight: 600; cursor: pointer; }
      #result { margin-top: 18px; color: #86efac; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>Demo Contact Form</h1>
      <p>Use this page to test form automation without relying on a third-party website.</p>
      <div class="row">
        <div>
          <label for="name">Name</label>
          <input id="name" name="name" />
        </div>
        <div>
          <label for="email">Email</label>
          <input id="email" name="email" type="email" />
        </div>
      </div>
      <label for="company">Company</label>
      <input id="company" name="company" />
      <label for="role">Role</label>
      <select id="role" name="role">
        <option value="">Select role</option>
        <option>Founder</option>
        <option>Operations</option>
        <option>Developer</option>
      </select>
      <label for="message">Message</label>
      <textarea id="message" name="message"></textarea>
      <label class="checkbox" for="agree">
        <input id="agree" type="checkbox" />
        <span>I agree to be contacted.</span>
      </label>
      <button id="submit" type="button">Submit</button>
      <div id="result"></div>
    </div>
    <script>
      document.getElementById('submit').addEventListener('click', () => {
        const name = document.getElementById('name').value || 'Anonymous';
        document.getElementById('result').textContent = 'Submitted successfully for ' + name + '.';
      });
    </script>
  </body>
</html>`)} `;
const waitForPageReady = getStarterPackageById('starter-wait-for-page-ready');
const downloadJson = getStarterPackageById('starter-download-json');
const starterWorkflows: Array<Partial<Workflow>> = [
  {
    id: nanoid(),
    name: 'Capture current page',
    description: 'Take a screenshot of the active tab and save it to your computer.',
    icon: 'riImageLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block('capture-trigger', 'trigger', { x: 80, y: 120 }, manualTriggerData()),
        block(
          'capture-active-tab',
          'active-tab',
          { x: 360, y: 120 },
          {
            description: 'Use the current tab',
          }
        ),
        block(
          'capture-screenshot',
          'take-screenshot',
          { x: 640, y: 120 },
          {
            description: 'Save screenshot',
            fileName: 'browsless-capture',
            ext: 'png',
            quality: 100,
            captureActiveTab: true,
            saveToComputer: true,
            fullPage: false,
            saveToColumn: false,
            assignVariable: false,
          }
        ),
      ],
      edges: [
        edge('capture-trigger', 'capture-active-tab'),
        edge('capture-active-tab', 'capture-screenshot'),
      ],
      position: [0, 0],
      zoom: 1,
    },
  },
  {
    id: nanoid(),
    name: 'Download images from search',
    description:
      'Search Unsplash for a keyword, collect the first images, and download them in bulk.',
    icon: 'riImageLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block(
          'images-trigger',
          'trigger',
          { x: 80, y: 120 },
          manualTriggerData({
            parameters: [
              {
                name: 'keyword',
                type: 'string',
                defaultValue: 'cats',
                placeholder: 'cats',
              },
              { name: 'count', type: 'string', defaultValue: '5', placeholder: '5' },
            ],
          })
        ),
        block(
          'images-open-search',
          'new-tab',
          { x: 360, y: 120 },
          {
            description: 'Open image search',
            url: 'https://unsplash.com/s/photos/{{variables@keyword}}',
            active: true,
          }
        ),
        packageBlock('images-wait-page', { x: 660, y: 120 }, waitForPageReady),
        block(
          'images-extract-urls',
          'javascript-code',
          { x: 980, y: 120 },
          {
            description: 'Collect image URLs',
            code: `const limit = Number(browslessRefData('variables', 'count') || 5);
const keyword = browslessRefData('variables', 'keyword') || 'images';
const dataset = [...document.querySelectorAll('img[src^="https://images.unsplash.com"]')]
  .map((img, index) => ({
    url: img.currentSrc || img.src,
    filename: keyword + '-' + (index + 1) + '.jpg',
  }))
  .filter((item, index, arr) => item.url && arr.findIndex((entry) => entry.url === item.url) === index)
  .slice(0, limit);

browslessSetVariable('dataset', dataset);
browslessNextBlock();`,
            timeout: 20000,
            context: 'website',
            preloadScripts: [],
          }
        ),
        block(
          'images-loop',
          'loop-data',
          { x: 1280, y: 120 },
          {
            description: 'Loop through downloaded images',
            loopId: 'images',
            loopThrough: 'variable',
            variableName: 'dataset',
            maxLoop: 0,
            startIndex: 0,
          }
        ),
        block(
          'images-download',
          'save-assets',
          { x: 1560, y: 120 },
          {
            description: 'Download current image',
            type: 'url',
            url: '{{loopData.images.data.url}}',
            filename: '{{loopData.images.data.filename}}',
            onConflict: 'uniquify',
            saveDownloadIds: false,
            saveData: false,
            assignVariable: false,
          }
        ),
        block(
          'images-breakpoint',
          'loop-breakpoint',
          { x: 1840, y: 120 },
          {
            loopId: 'images',
            clearLoop: false,
          }
        ),
      ],
      edges: [
        edge('images-trigger', 'images-open-search'),
        edge('images-open-search', 'images-wait-page', {
          targetHandle: packageInputHandle('images-wait-page', 'start'),
        }),
        edge('images-wait-page', 'images-extract-urls', {
          sourceHandle: packageOutputHandle('images-wait-page', 'ready'),
        }),
        edge('images-extract-urls', 'images-loop'),
        edge('images-loop', 'images-download'),
        edge('images-download', 'images-breakpoint'),
      ],
      position: [0, 0],
      zoom: 0.95,
    },
  },
  {
    id: nanoid(),
    name: 'Collect search results',
    description:
      'Run a search, collect titles, URLs, and descriptions, then download them as JSON.',
    icon: 'riSearch2Line',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block(
          'search-trigger',
          'trigger',
          { x: 80, y: 120 },
          manualTriggerData({
            parameters: [
              {
                name: 'query',
                type: 'string',
                defaultValue: 'best mechanical keyboards',
                placeholder: 'best mechanical keyboards',
              },
            ],
          })
        ),
        block(
          'search-open',
          'new-tab',
          { x: 360, y: 120 },
          {
            description: 'Open search results',
            url: 'https://duckduckgo.com/?q={{variables@query}}&ia=web',
            active: true,
          }
        ),
        packageBlock('search-wait', { x: 660, y: 120 }, waitForPageReady),
        block(
          'search-extract-results',
          'javascript-code',
          { x: 980, y: 120 },
          {
            description: 'Collect results into dataset',
            code: `const cards = [...document.querySelectorAll('[data-testid="result"]')].slice(0, 10);
const dataset = cards.map((card) => ({
  title: card.querySelector('[data-testid="result-title-a"]')?.textContent?.trim() || '',
  url: card.querySelector('[data-testid="result-title-a"]')?.href || '',
  description: card.querySelector('[data-result="snippet"]')?.textContent?.trim() || '',
})).filter((item) => item.title && item.url);

browslessSetVariable('dataset', dataset);
browslessNextBlock();`,
            timeout: 20000,
            context: 'website',
            preloadScripts: [],
          }
        ),
        packageBlock('search-download-json', { x: 1280, y: 120 }, downloadJson),
      ],
      edges: [
        edge('search-trigger', 'search-open'),
        edge('search-open', 'search-wait', {
          targetHandle: packageInputHandle('search-wait', 'start'),
        }),
        edge('search-wait', 'search-extract-results', {
          sourceHandle: packageOutputHandle('search-wait', 'ready'),
        }),
        edge('search-extract-results', 'search-download-json', {
          targetHandle: packageInputHandle('search-download-json', 'start'),
        }),
      ],
      position: [0, 0],
      zoom: 1,
    },
  },
  {
    id: nanoid(),
    name: 'YouTube Subscription Manager',
    description:
      'Collect your YouTube subscriptions into JSON. Sign in to YouTube before running it.',
    icon: 'riYoutubeLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block('yt-trigger', 'trigger', { x: 80, y: 120 }, manualTriggerData()),
        block(
          'yt-open',
          'new-tab',
          { x: 360, y: 120 },
          {
            description: 'Open subscriptions page',
            url: 'https://www.youtube.com/feed/channels',
            active: true,
          }
        ),
        packageBlock('yt-wait', { x: 660, y: 120 }, waitForPageReady),
        block(
          'yt-extract',
          'javascript-code',
          { x: 980, y: 120 },
          {
            description: 'Collect subscriptions',
            code: `const dataset = [...document.querySelectorAll('ytd-channel-renderer')].map((item) => ({
  name: item.querySelector('#channel-title')?.textContent?.trim() || '',
  url: item.querySelector('#main-link')?.href || '',
  subscribers: item.querySelector('#subscribers')?.textContent?.trim() || '',
})).filter((item) => item.name);

browslessSetVariable('dataset', dataset);
browslessNextBlock();`,
            timeout: 20000,
            context: 'website',
            preloadScripts: [],
          }
        ),
        packageBlock('yt-download', { x: 1280, y: 120 }, downloadJson),
      ],
      edges: [
        edge('yt-trigger', 'yt-open'),
        edge('yt-open', 'yt-wait', {
          targetHandle: packageInputHandle('yt-wait', 'start'),
        }),
        edge('yt-wait', 'yt-extract', {
          sourceHandle: packageOutputHandle('yt-wait', 'ready'),
        }),
        edge('yt-extract', 'yt-download', {
          targetHandle: packageInputHandle('yt-download', 'start'),
        }),
      ],
      position: [0, 0],
      zoom: 1,
    },
  },
  {
    id: nanoid(),
    name: 'Extract current page',
    description:
      'Turn the active page into a structured JSON snapshot with metadata, headings, links, and images.',
    icon: 'riFileListLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block('page-trigger', 'trigger', { x: 80, y: 120 }, manualTriggerData()),
        block(
          'page-active-tab',
          'active-tab',
          { x: 360, y: 120 },
          {
            description: 'Use the current page',
          }
        ),
        packageBlock('page-wait', { x: 660, y: 120 }, waitForPageReady),
        block(
          'page-extract',
          'javascript-code',
          { x: 980, y: 120 },
          {
            description: 'Build page JSON',
            code: `const dataset = [{
  title: document.title,
  url: location.href,
  description: document.querySelector('meta[name="description"]')?.content || '',
  headings: [...document.querySelectorAll('h1, h2, h3')].map((item) => item.textContent.trim()).filter(Boolean).slice(0, 20),
  links: [...document.querySelectorAll('a[href]')].map((item) => ({ text: (item.textContent || '').trim(), url: item.href })).filter((item) => item.url).slice(0, 50),
  images: [...document.querySelectorAll('img[src]')].map((item) => item.currentSrc || item.src).filter(Boolean).slice(0, 30),
}];

browslessSetVariable('dataset', dataset);
browslessNextBlock();`,
            timeout: 20000,
            context: 'website',
            preloadScripts: [],
          }
        ),
        packageBlock('page-download', { x: 1280, y: 120 }, downloadJson),
      ],
      edges: [
        edge('page-trigger', 'page-active-tab'),
        edge('page-active-tab', 'page-wait', {
          targetHandle: packageInputHandle('page-wait', 'start'),
        }),
        edge('page-wait', 'page-extract', {
          sourceHandle: packageOutputHandle('page-wait', 'ready'),
        }),
        edge('page-extract', 'page-download', {
          targetHandle: packageInputHandle('page-download', 'start'),
        }),
      ],
      position: [0, 0],
      zoom: 1,
    },
  },
  {
    id: nanoid(),
    name: 'Auto-fill a form',
    description:
      'Open a built-in demo form, fill it out automatically, accept consent, and submit it.',
    icon: 'riFileEditLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block('form-trigger', 'trigger', { x: 80, y: 120 }, manualTriggerData()),
        block(
          'form-open',
          'new-tab',
          { x: 360, y: 120 },
          {
            description: 'Open demo form',
            url: autofillDemoPage,
            active: true,
          }
        ),
        packageBlock('form-wait', { x: 660, y: 120 }, waitForPageReady),
        block(
          'form-name',
          'forms',
          { x: 980, y: 30 },
          {
            description: 'Fill name',
            selector: '#name',
            type: 'text-field',
            value: 'Taylor Morgan',
            clearValue: true,
            selected: true,
          }
        ),
        block(
          'form-email',
          'forms',
          { x: 980, y: 140 },
          {
            description: 'Fill email',
            selector: '#email',
            type: 'text-field',
            value: 'taylor@example.com',
            clearValue: true,
            selected: true,
          }
        ),
        block(
          'form-company',
          'forms',
          { x: 980, y: 250 },
          {
            description: 'Fill company',
            selector: '#company',
            type: 'text-field',
            value: 'Browsless',
            clearValue: true,
            selected: true,
          }
        ),
        block(
          'form-role',
          'forms',
          { x: 1260, y: 80 },
          {
            description: 'Select role',
            selector: '#role',
            type: 'select',
            value: 'Developer',
            selectOptionBy: 'value',
            selected: true,
          }
        ),
        block(
          'form-message',
          'forms',
          { x: 1260, y: 220 },
          {
            description: 'Fill message',
            selector: '#message',
            type: 'text-field',
            value: 'Hello from the starter workflow. This form was filled automatically.',
            clearValue: true,
            selected: true,
          }
        ),
        block(
          'form-consent',
          'event-click',
          { x: 1540, y: 120 },
          {
            description: 'Accept consent',
            selector: '#agree',
          }
        ),
        block(
          'form-submit',
          'event-click',
          { x: 1820, y: 120 },
          {
            description: 'Submit form',
            selector: '#submit',
          }
        ),
      ],
      edges: [
        edge('form-trigger', 'form-open'),
        edge('form-open', 'form-wait', {
          targetHandle: packageInputHandle('form-wait', 'start'),
        }),
        edge('form-wait', 'form-name', {
          sourceHandle: packageOutputHandle('form-wait', 'ready'),
        }),
        edge('form-name', 'form-email'),
        edge('form-email', 'form-company'),
        edge('form-company', 'form-role'),
        edge('form-role', 'form-message'),
        edge('form-message', 'form-consent'),
        edge('form-consent', 'form-submit'),
      ],
      position: [0, 0],
      zoom: 0.9,
    },
  },
  {
    id: nanoid(),
    name: 'Morning browser routine',
    description:
      'Open a small set of websites every weekday morning as a starter scheduler example.',
    icon: 'riCalendarLine',
    createdAt: Date.now(),
    drawflow: {
      nodes: [
        block(
          'routine-trigger',
          'trigger',
          { x: 80, y: 120 },
          {
            ...manualTriggerData(),
            type: 'specific-day',
            time: '08:00',
            days: [1, 2, 3, 4, 5].map((id) => ({ id, times: ['08:00'] })),
          }
        ),
        block(
          'routine-gmail',
          'new-tab',
          { x: 360, y: 120 },
          {
            description: 'Open Gmail',
            url: 'https://mail.google.com/',
            active: true,
          }
        ),
        block(
          'routine-calendar',
          'new-tab',
          { x: 640, y: 120 },
          {
            description: 'Open Calendar',
            url: 'https://calendar.google.com/',
            active: false,
          }
        ),
        block(
          'routine-news',
          'new-tab',
          { x: 920, y: 120 },
          {
            description: 'Open news',
            url: 'https://news.ycombinator.com/',
            active: false,
          }
        ),
        block(
          'routine-dashboard',
          'new-tab',
          { x: 1200, y: 120 },
          {
            description: 'Open GitHub dashboard',
            url: 'https://github.com/',
            active: false,
          }
        ),
      ],
      edges: [
        edge('routine-trigger', 'routine-gmail'),
        edge('routine-gmail', 'routine-calendar'),
        edge('routine-calendar', 'routine-news'),
        edge('routine-news', 'routine-dashboard'),
      ],
      position: [0, 0],
      zoom: 1,
    },
  },
];
export default starterWorkflows;
