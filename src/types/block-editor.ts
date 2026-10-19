import type { WorkflowTriggerEntry } from '@/types/runtime';

/** Numeric editor fields can contain template expressions before execution. */
export type NumericInput = number | string;

export interface InsertDataItem {
  type: string;
  name: string;
  value: string;
  filePath?: string;
  isFile?: boolean;
  action?: string;
  csvAction?: string;
  xlsSheet?: string;
  xlsRange?: string;
}
export interface ParameterOptions {
  required?: boolean;
  useMask?: boolean;
  unmaskValue?: boolean;
  masks?: { mask: string; isRegex?: boolean; lazy?: boolean }[];
  customTokens?: { symbol: string; regex: string }[];
}
export interface WorkflowParameter {
  id?: string;
  name: string;
  type: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  data?: ParameterOptions;
}
export interface ConditionItem {
  id: string;
  type: string;
  category: 'value' | 'compare';
  data?: Record<string, unknown>;
}
export interface ConditionGroup {
  id: string;
  conditions: { id: string; items: ConditionItem[] }[];
}
export interface ConditionPath {
  id: string;
  name: string;
  conditions: ConditionGroup[];
  compareValue?: string;
  value?: string;
  type?: string;
}
export interface PreloadScript {
  src: string;
  type?: string;
  removeAfterExec?: boolean;
}
export interface MappingDestination {
  id: string;
  name: string;
}
export interface MappingSource extends MappingDestination {
  destinations: MappingDestination[];
}
export interface InsertWorkflowDataFields {
  saveData?: boolean;
  dataColumn?: string;
  assignVariable?: boolean;
  variableName?: string;
  addExtraRow?: boolean;
  extraRowValue?: string;
  extraRowDataColumn?: string;
}
export interface BlockErrorSettings {
  isInGroup?: boolean;
  enable?: boolean;
  retry?: boolean;
  retryTimes?: NumericInput;
  retryInterval?: NumericInput;
  toDo?: string;
  errorMessage?: string;
  insertData?: boolean;
  dataToInsert?: InsertDataItem[];
}
export interface BlockGeneralSettings {
  blockTimeout?: number;
  debugMode?: boolean;
}
export interface BlockSettingsPayload {
  id?: string;
  blockId?: string;
  itemId?: string;
  data?: { onError?: BlockErrorSettings; settings?: BlockGeneralSettings };
}

export type TriggerEventParams = MouseEventInit &
  KeyboardEventInit &
  WheelEventInit &
  InputEventInit & {
    keyCode?: number;
    movementX?: number;
    movementY?: number;
    offsetX?: number;
    offsetY?: number;
    pageX?: number;
    pageY?: number;
  };

export interface TriggerData {
  disableBlock?: boolean;
  description?: string;
  type?: string;
  interval?: NumericInput;
  delay?: NumericInput;
  date?: string;
  time?: string;
  url?: string;
  shortcut?: string;
  activeInInput?: boolean;
  isUrlRegex?: boolean;
  days?: number[];
  contextMenuName?: string;
  contextTypes?: string[];
  parameters?: WorkflowParameter[];
  preferParamsInTab?: boolean;
  observeElement?: {
    selector?: string;
    baseSelector?: string;
    matchPattern?: string;
    targetOptions?: {
      subtree?: boolean;
      childList?: boolean;
      attributes?: boolean;
      attributeFilter?: string[];
      characterData?: boolean;
    };
    baseElOptions?: {
      subtree?: boolean;
      childList?: boolean;
      attributes?: boolean;
      attributeFilter?: string[];
      characterData?: boolean;
    };
  };
  triggers?: WorkflowTriggerEntry[];
  expression?: string;
  [key: string]: unknown;
}

export interface ExecuteWorkflowData {
  disableBlock?: boolean;
  executeId?: string;
  workflowId?: string;
  globalData?: string;
  description?: string;
  insertAllVars?: boolean;
  insertAllGlobalData?: boolean;
  [key: string]: unknown;
}

export interface NewTabData {
  disableBlock?: boolean;
  description?: string;
  url?: string;
  userAgent?: string;
  active?: boolean;
  tabZoom?: NumericInput;
  inGroup?: boolean;
  waitTabLoaded?: boolean;
  updatePrevTab?: boolean;
  customUserAgent?: boolean;
  [key: string]: unknown;
}

export interface SwitchTabData {
  disableBlock?: boolean;
  description?: string;
  url?: string;
  tabIndex?: NumericInput;
  tabTitle?: string;
  matchPattern?: string;
  activeTab?: boolean;
  createIfNoMatch?: boolean;
  findTabBy?: string;
  [key: string]: unknown;
}

export interface NewWindowData {
  disableBlock?: boolean;
  description?: string;
  top?: NumericInput;
  left?: NumericInput;
  width?: NumericInput;
  url?: string;
  height?: NumericInput;
  type?: string;
  incognito?: boolean;
  windowState?: string;
  [key: string]: unknown;
}

export interface ProxyData {
  description?: string;
  disableBlock?: boolean;
  scheme?: string;
  host?: string;
  port?: NumericInput;
  bypassList?: string;
  clearProxy?: boolean;
  [key: string]: unknown;
}

export interface CloseTabData {
  disableBlock?: boolean;
  url?: string;
  description?: string;
  activeTab?: boolean;
  closeType?: string;
  allWindows?: boolean;
  [key: string]: unknown;
}

export interface TakeScreenshotData {
  description?: string;
  disableBlock?: boolean;
  fileName?: string;
  ext?: string;
  quality?: NumericInput;
  dataColumn?: string;
  variableName?: string;
  selector?: string;
  fullPage?: boolean;
  saveToColumn?: boolean;
  saveToComputer?: boolean;
  assignVariable?: boolean;
  captureActiveTab?: boolean;
  type?: string;
  [key: string]: unknown;
}

export interface BrowserEventData {
  disableBlock?: boolean;
  description?: string;
  timeout?: NumericInput;
  eventName?: string;
  setAsActiveTab?: boolean;
  activeTabLoaded?: boolean;
  tabLoadedUrl?: string;
  tabUrl?: string;
  fileQuery?: string;
  [key: string]: unknown;
}

export interface InteractionBaseData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  disableMultiple?: boolean;
  [key: string]: unknown;
}

export interface DelayData {
  disableBlock?: boolean;
  time?: NumericInput;
  [key: string]: unknown;
}

export interface GetTextData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  regex?: string;
  prefixText?: string;
  suffixText?: string;
  regexExp?: string[];
  dataColumn?: string;
  saveData?: boolean;
  includeTags?: boolean;
  addExtraRow?: boolean;
  assignVariable?: boolean;
  useTextContent?: boolean;
  variableName?: string;
  extraRowValue?: string;
  extraRowDataColumn?: string;
  [key: string]: unknown;
}

export interface ScrollElementData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  scrollY?: NumericInput;
  scrollX?: NumericInput;
  incX?: boolean;
  incY?: boolean;
  smooth?: boolean;
  scrollIntoView?: boolean;
  [key: string]: unknown;
}

export interface LinkData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  disableMultiple?: boolean;
  openInNewTab?: boolean;
  [key: string]: unknown;
}

export interface AttributeValueData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  attributeValue?: string;
  attributeName?: string;
  assignVariable?: boolean;
  variableName?: string;
  dataColumn?: string;
  saveData?: boolean;
  action?: string;
  addExtraRow?: boolean;
  extraRowValue?: string;
  extraRowDataColumn?: string;
  [key: string]: unknown;
}

export interface FormsData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  selected?: boolean;
  clearValue?: boolean;
  getValue?: boolean;
  saveData?: boolean;
  dataColumn?: string;
  selectOptionBy?: string;
  optionPosition?: string;
  assignVariable?: boolean;
  variableName?: string;
  type?: string;
  value?: string;
  delay?: NumericInput;
  events?: string[];
  disableMultiple?: boolean;
  [key: string]: unknown;
}

export interface JavascriptCodeData {
  disableBlock?: boolean;
  description?: string;
  timeout?: NumericInput;
  context?: string;
  code?: string;
  preloadScripts?: PreloadScript[];
  everyNewTab?: boolean;
  runBeforeLoad?: boolean;
  [key: string]: unknown;
}

export interface TriggerEventData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  eventName?: string;
  eventType?: string;
  eventParams?: TriggerEventParams;
  [key: string]: unknown;
}

export interface ConditionsData {
  description?: string;
  disableBlock?: boolean;
  conditions?: ConditionPath[];
  retryConditions?: boolean;
  retryCount?: NumericInput;
  retryTimeout?: NumericInput;
  [key: string]: unknown;
}

export interface ElementExistsData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  selector?: string;
  tryCount?: NumericInput;
  timeout?: NumericInput;
  markEl?: boolean;
  throwError?: boolean;
  [key: string]: unknown;
}

export interface WebhookData {
  disableBlock?: boolean;
  description?: string;
  url?: string;
  body?: string;
  headers?: { name: string; value: string }[];
  method?: string;
  timeout?: NumericInput;
  dataPath?: string;
  contentType?: string;
  variableName?: string;
  assignVariable?: boolean;
  saveData?: boolean;
  dataColumn?: string;
  responseType?: string;
  [key: string]: unknown;
}

export interface WhileLoopData {
  disableBlock?: boolean;
  description?: string;
  conditions?: ConditionGroup[] | null;
  [key: string]: unknown;
}

export interface LoopDataData {
  disableBlock?: boolean;
  loopId?: string;
  maxLoop?: NumericInput;
  toNumber?: NumericInput;
  fromNumber?: NumericInput;
  startIndex?: NumericInput;
  loopData?: string;
  description?: string;
  variableName?: string;
  reverseLoop?: boolean;
  elementSelector?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  resumeLastWorkflow?: boolean;
  loopThrough?: string;
  [key: string]: unknown;
}

export interface LoopElementsData {
  disableBlock?: boolean;
  loopId?: string;
  selector?: string;
  maxLoop?: string;
  description?: string;
  reverseLoop?: boolean;
  actionElSelector?: string;
  findBy?: string;
  actionElMaxWaitTime?: NumericInput;
  actionPageMaxWaitTime?: NumericInput;
  loadMoreAction?: string;
  scrollToBottom?: boolean;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  actionElTimeout?: NumericInput;
  [key: string]: unknown;
}

export interface ClipboardData {
  disableBlock?: boolean;
  description?: string;
  type?: string;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
  dataToCopy?: string;
  copySelectedText?: boolean;
  [key: string]: unknown;
}

export interface InsertDataData {
  disableBlock?: boolean;
  description?: string;
  dataList?: InsertDataItem[];
  [key: string]: unknown;
}

export interface SwitchToData {
  disableBlock?: boolean;
  findBy?: string;
  selector?: string;
  windowType?: string;
  [key: string]: unknown;
}

export interface UploadFileData {
  disableBlock?: boolean;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  filePaths?: string[];
  [key: string]: unknown;
}

export interface SaveAssetsData {
  disableBlock?: boolean;
  description?: string;
  findBy?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  markEl?: boolean;
  multiple?: boolean;
  type?: string;
  url?: string;
  filename?: string;
  saveDownloadIds?: boolean;
  onConflict?: string;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  [key: string]: unknown;
}

export interface PressKeyData {
  disableBlock?: boolean;
  keys?: string;
  selector?: string;
  pressTime?: string;
  description?: string;
  keysToPress?: string;
  action?: string;
  [key: string]: unknown;
}

export interface HandleDialogData {
  disableBlock?: boolean;
  description?: string;
  accept?: boolean;
  promptText?: string;
  [key: string]: unknown;
}

export interface HandleDownloadData {
  disableBlock?: boolean;
  description?: string;
  filename?: string;
  timeout?: NumericInput;
  onConflict?: string;
  waitForDownload?: boolean;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  downloadId?: string;
  [key: string]: unknown;
}

export interface DeleteDataData {
  disableBlock?: boolean;
  description?: string;
  deleteList?: { type: string; variableName: string; columnId: string }[];
  [key: string]: unknown;
}

export interface WaitConnectionsData {
  disableBlock?: boolean;
  description?: string;
  timeout?: NumericInput;
  specificFlow?: boolean;
  flowBlockId?: string;
  [key: string]: unknown;
}

export interface NotificationData {
  disableBlock?: boolean;
  description?: string;
  message?: string;
  iconUrl?: string;
  imageUrl?: string;
  title?: string;
  [key: string]: unknown;
}

export interface LogDataData {
  disableBlock?: boolean;
  description?: string;
  workflowId?: string;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  [key: string]: unknown;
}

export interface TabURLData {
  disableBlock?: boolean;
  description?: string;
  type?: string;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  qTitle?: string;
  qMatchPatterns?: string;
  [key: string]: unknown;
}

export interface SliceVariableData {
  disableBlock?: boolean;
  description?: string;
  endIdxEnabled?: boolean;
  startIdxEnabled?: boolean;
  endIndex?: NumericInput;
  startIndex?: NumericInput;
  variableName?: string;
  [key: string]: unknown;
}

export interface IncreaseVariableData {
  disableBlock?: boolean;
  description?: string;
  increaseBy?: NumericInput;
  variableName?: string;
  [key: string]: unknown;
}

export interface RegexVariableData {
  disableBlock?: boolean;
  method?: string;
  replaceVal?: string;
  description?: string;
  expression?: string;
  flag?: string[];
  [key: string]: unknown;
}

export interface DataMappingData {
  disableBlock?: boolean;
  description?: string;
  dataSource?: string;
  sources?: MappingSource[];
  varSourceName?: string;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  [key: string]: unknown;
}

export interface SortDataData {
  disableBlock?: boolean;
  description?: string;
  sortByProperty?: boolean;
  itemProperties?: { name: string; order: string }[];
  dataSource?: string;
  varSourceName?: string;
  dataColumn?: string;
  saveData?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  [key: string]: unknown;
}

export interface CreateElementData {
  disableBlock?: boolean;
  description?: string;
  javascript?: string;
  html?: string;
  css?: string;
  preloadScripts?: PreloadScript[];
  findBy?: string;
  insertAt?: string;
  runBeforeLoad?: boolean;
  waitForSelector?: boolean;
  waitSelectorTimeout?: NumericInput;
  selector?: string;
  [key: string]: unknown;
}

export interface CookieData {
  disableBlock?: boolean;
  description?: string;
  type?: string;
  jsonCode?: string;
  useJson?: boolean;
  getAll?: boolean;
  domain?: string;
  expirationDate?: string;
  path?: string;
  sameSite?: string;
  name?: string;
  url?: string;
  value?: string;
  httpOnly?: boolean;
  secure?: boolean;
  session?: boolean;
  assignVariable?: boolean;
  variableName?: string;
  saveData?: boolean;
  dataColumn?: string;
  [key: string]: unknown;
}

export interface WorkflowStateData {
  disableBlock?: boolean;
  description?: string;
  type?: string;
  exceptCurrent?: boolean;
  workflowsToStop?: string[];
  throwError?: boolean;
  errorMessage?: string;
  [key: string]: unknown;
}

export interface ParameterPromptData {
  disableBlock?: boolean;
  description?: string;
  timeout?: NumericInput;
  parameters?: WorkflowParameter[];
  [key: string]: unknown;
}

export interface TriggerFormData {
  interval?: number;
  delay?: number;
  fixedDelay?: boolean;
  expression?: string;
  date?: string;
  time?: string;
  days?: (number | { id: number; times: string[] })[];
  url?: string;
  isUrlRegex?: boolean;
  supportSPA?: boolean;
  shortcut?: string;
  activeInInput?: boolean;
  observeElement?: {
    selector: string;
    baseSelector: string;
    matchPattern: string;
    targetOptions: MutationObserverInit;
    baseElOptions: MutationObserverInit;
  };
}

export interface WorkflowEventAction {
  type: string;
  code?: string;
  url?: string;
  body?: string;
  method?: string;
  headers?: { name: string; value: string }[];
}
export interface WorkflowEvent {
  id?: string;
  name: string;
  events: string[];
  action: WorkflowEventAction;
}
