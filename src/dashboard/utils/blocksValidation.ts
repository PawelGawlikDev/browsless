import { browser } from 'wxt/browser';
type BrowserPermission = chrome.runtime.ManifestPermission;
type ValidationResult = Promise<string[]>;
type TriggerItem = {
  type: string;
  data: Record<string, any>;
};
type TriggerValidator = (triggerData: Record<string, any>) => void | Promise<void>;
type ValidationHandler = (data: Record<string, any>) => ValidationResult;
const checkPermissions = (permissions: BrowserPermission[]) =>
  browser.permissions.contains({ permissions });
const isEmptyStr = (str?: string | null) => !str?.trim();
const defaultOptions = {
  once: false,
};
export const validateTrigger = async (data: Record<string, any>) => {
  const errors: string[] = [];
  const checkValue = (
    value: string | undefined,
    {
      name,
      location,
    }: {
      name: string;
      location: string;
    }
  ) => {
    if (value && value.trim()) return;
    errors.push(`"${name}" is empty in the ${location}`);
  };
  const triggersValidation: Record<string, TriggerValidator> = {
    'cron-job': (triggerData) => {
      checkValue(triggerData.expression, {
        name: 'Expression',
        location: 'Cron job trigger',
      });
    },
    'context-menu': async (triggerData) => {
      const hasPermission = await checkPermissions(['contextMenus']);
      if (!hasPermission) {
        errors.push(
          "Doesn't have permission for the Context menu trigger (ignore if you already grant the permissions)"
        );
      } else {
        checkValue(triggerData.contextMenuName, {
          name: 'Context menu name',
          location: 'Context menu trigger',
        });
      }
    },
    date: (triggerData) => {
      checkValue(triggerData.date, {
        name: 'Date',
        location: 'On a specific date tigger',
      });
    },
    'visit-web': (triggerData) => {
      checkValue(triggerData.url, {
        name: 'URL',
        location: 'Visit web trigger',
      });
    },
    'keyboard-shortcut': (triggerData) => {
      checkValue(triggerData.shortcut, {
        name: 'Shortcut',
        location: 'Shortcut trigger',
      });
    },
  };
  if (data.triggers) {
    for (const trigger of data.triggers as TriggerItem[]) {
      const validate = triggersValidation[trigger.type];
      if (validate) await validate(trigger.data);
    }
  } else {
    const validate = triggersValidation[data.type];
    if (validate) await validate(data);
  }
  return errors;
};
export const validateExecuteWorkflow = async (data: Record<string, any>) => {
  if (isEmptyStr(data.workflowId)) return ['No workflow selected'];
  return [];
};
export const validateNewTab = async (data: Record<string, any>) => {
  if (isEmptyStr(data.url)) return ['URL is empty'];
  return [];
};
export const validateSwitchTab = async (data: Record<string, any>) => {
  const errors: string[] = [];
  const validateItems = {
    'match-patterns': () => {
      if (isEmptyStr(data.matchPattern)) errors.push('The Match patterns is empty');
    },
    'tab-title': () => {
      if (isEmptyStr(data.tabTitle)) errors.push('The Tab title is empty');
    },
  };
  if (validateItems[data.findTabBy]) validateItems[data.findTabBy]();
  return errors;
};
export const validateProxy = async () => {
  return [];
};
export const validateCloseTab = async (data: Record<string, any>) => {
  if (data.closeType === 'tab' && !data.activeTab && isEmptyStr(data.url)) {
    return ['The Match patterns is empty'];
  }
  return [];
};
export const validateTakeScreenshot = async (data: Record<string, any>) => {
  if (data.type === 'element' && isEmptyStr(data.selector)) {
    return ['The CSS selector is empty'];
  }
  return [];
};
export const validateInteractionBasic = async (data: Record<string, any>) => {
  if (isEmptyStr(data.selector)) return ['The Selector is empty'];
  return [];
};
export const validateExportData = async (data: Record<string, any>) => {
  const errors: string[] = [];
  const hasPermission = await checkPermissions(['downloads']);
  if (!hasPermission)
    errors.push(
      "Don't have download permission (ignore if you already grant the permissions)"
    );
  if (data.dataToExport === 'variable' && isEmptyStr(data.variableName)) {
    errors.push('The Variable name is empty');
  } else if (data.dataToExport === 'google-sheets' && isEmptyStr(data.refKey)) {
    errors.push('The Reference key is empty');
  }
  return errors;
};
export const validateAttributeValue = async (data: Record<string, any>) => {
  const errors: string[] = [];
  if (isEmptyStr(data.selector)) errors.push('The Selector is empty');
  if (isEmptyStr(data.attributeName)) errors.push('The Attribute name is empty');
  return errors;
};
export const validateGoogleSheets = async (data: Record<string, any>) => {
  const errors: string[] = [];
  if (isEmptyStr(data.spreadsheetId)) errors.push('The Spreadsheet Id is empty');
  if (isEmptyStr(data.range)) errors.push('The Range is empty');
  return errors;
};
export const validateWebhook = async (data: Record<string, any>) => {
  if (isEmptyStr(data.url)) return ['The URL is empty'];
  return [];
};
export const validateLoopData = async (data: Record<string, any>) => {
  const errors: string[] = [];
  if (isEmptyStr(data.loopId)) errors.push('The Loop id is empty');
  const loopThroughItems = {
    'google-sheets': () => {
      if (isEmptyStr(data.referenceKey)) errors.push('The Reference key is empty');
    },
    variable: () => {
      if (isEmptyStr(data.variableName)) errors.push('The Variable name is empty');
    },
  };
  const validateItem = loopThroughItems[data.loopThrough];
  if (validateItem) validateItem();
  return errors;
};
export const validateLoopElements = async (data: Record<string, any>) => {
  const errors: string[] = [];
  if (isEmptyStr(data.loopId)) errors.push('The Loop id is empty');
  if (isEmptyStr(data.selector)) errors.push('The Selector is empty');
  if (
    ['click-element', 'click-link'].includes(data.loadMoreAction) &&
    isEmptyStr(data.actionElSelector)
  ) {
    errors.push('The Selector for loading more elements is empty');
  }
  return errors;
};
export const validateClipboard = async () => {
  const permissions: BrowserPermission[] = ['clipboardRead'];
  const hasPermission = await checkPermissions(permissions);
  if (!hasPermission)
    return [
      "Don't have permission to access the clipboard (ignore if you already grant the permissions)",
    ];
  return [];
};
export const validateSwitchTo = async (data: Record<string, any>) => {
  if (data.windowType === 'iframe' && isEmptyStr(data.selector)) {
    return ['The Selector for Iframe is empty'];
  }
  return [];
};
export const validateUploadFile = async (data: Record<string, any>) => {
  const errors: string[] = [];
  if (isEmptyStr(data.selector)) errors.push('The Selector is empty');
  const filePaths = Array.isArray(data.filePaths) ? data.filePaths : [];
  const someInputsEmpty = filePaths.some((path: string) => isEmptyStr(path));
  if (someInputsEmpty) errors.push('Some of the file paths is empty');
  return errors;
};
export const validateSaveAssets = async (data: Record<string, any>) => {
  const errors: string[] = [];
  const hasPermission = await checkPermissions(['downloads']);
  if (!hasPermission)
    errors.push(
      "Don't have download permission (ignore if you already grant the permissions)"
    );
  else if (isEmptyStr(data.selector) && data.type === 'element')
    errors.push('The Selector is empty');
  return errors;
};
export const validatePressKey = async (data: Record<string, any>) => {
  const errors: string[] = [];
  const isKeyEmpty =
    !data.action || (data.action === 'press-key' && isEmptyStr(data.keys));
  const isMultipleKeysEmpty =
    data.action === 'multiple-keys' && isEmptyStr(data.keysToPress);
  if (isKeyEmpty || isMultipleKeysEmpty) errors.push('The Keys to press is empty');
  return errors;
};
export const validateNotification = async () => {
  const hasPermission = await checkPermissions(['notifications']);
  if (!hasPermission) return ["Don't have notifications permissions"];
  return [];
};
export const validateCookie = async () => {
  const hasPermission = await checkPermissions(['cookies']);
  if (!hasPermission) return ["Don't have cookies permissions"];
  return [];
};
const validators: Record<
  string,
  {
    once: boolean;
    func: ValidationHandler;
  }
> = {
  trigger: {
    ...defaultOptions,
    func: validateTrigger,
  },
  'execute-workflow': {
    ...defaultOptions,
    func: validateExecuteWorkflow,
  },
  'new-tab': {
    ...defaultOptions,
    func: validateNewTab,
  },
  'switch-tab': {
    ...defaultOptions,
    func: validateSwitchTab,
  },
  proxy: {
    ...defaultOptions,
    func: validateProxy,
  },
  'close-tab': {
    ...defaultOptions,
    func: validateCloseTab,
  },
  'take-screenshot': {
    ...defaultOptions,
    func: validateTakeScreenshot,
  },
  'event-click': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'get-text': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'export-data': {
    ...defaultOptions,
    func: validateExportData,
  },
  'element-scroll': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  link: {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'attribute-value': {
    ...defaultOptions,
    func: validateAttributeValue,
  },
  forms: {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'trigger-event': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'google-sheets': {
    ...defaultOptions,
    func: validateGoogleSheets,
  },
  'element-exists': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  webhook: {
    ...defaultOptions,
    func: validateWebhook,
  },
  'loop-data': {
    ...defaultOptions,
    func: validateLoopData,
  },
  'loop-elements': {
    ...defaultOptions,
    func: validateLoopElements,
  },
  clipboard: {
    ...defaultOptions,
    once: true,
    func: validateClipboard,
  },
  'switch-to': {
    ...defaultOptions,
    func: validateSwitchTo,
  },
  'upload-file': {
    ...defaultOptions,
    func: validateUploadFile,
  },
  'hover-element': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  'save-assets': {
    ...defaultOptions,
    func: validateSaveAssets,
  },
  'press-key': {
    ...defaultOptions,
    func: validatePressKey,
  },
  notification: {
    ...defaultOptions,
    func: validateNotification,
  },
  'create-element': {
    ...defaultOptions,
    func: validateInteractionBasic,
  },
  cookie: {
    ...defaultOptions,
    func: validateCookie,
  },
};
export default validators;
