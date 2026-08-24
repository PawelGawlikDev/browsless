type LogMessageData = {
  message: string;
  [key: string]: string | number | boolean | null | undefined;
};

const logMessages: Record<string, string> = {
  'url-empty': 'URL is empty',
  'invalid-url': 'URL is not valid',
  'conditions-empty': 'Conditions are empty',
  'workflow-disabled': 'Workflow is disabled',
  'selector-empty': 'Element selector is empty',
  'invalid-body': 'Content body is not a valid JSON',
  'invalid-active-tab': '"{url}" is an invalid URL',
  'empty-spreadsheet-id': 'Spreadsheet ID is empty',
  'invalid-loop-data': 'Invalid data to loop through',
  'empty-workflow': 'You must select a workflow first',
  'active-tab-removed': 'Workflow active tab was removed',
  'empty-spreadsheet-range': 'Spreadsheet range is empty',
  'stop-timeout': 'Workflow was stopped due to timeout',
  'no-file-access': "Browsless doesn't have access to the file",
  'no-workflow': 'Can\'t find a workflow with the ID "{workflowId}"',
  'no-match-tab': 'Can\'t find a tab matching the pattern "{pattern}"',
  'no-clipboard-acces': "Don't have permission to access the clipboard",
  'browser-not-supported': 'This feature not supported in {browser} browser',
  'element-not-found': 'Can\'t find an element with the selector "{selector}"',
  'no-permission': 'Don\'t have "{permission}" permission to perform this action',
  'not-iframe': 'Element with "{selector}" selector is not an iframe element',
  'iframe-not-found': 'Can\'t find an iframe element with the selector "{selector}"',
  'workflow-infinite-loop': "Can't execute the workflow to prevent an infinite loop",
  'not-debug-mode': 'The workflow must run in debug mode for this block to work properly',
  'no-iframe-id':
    'Can\'t find the Frame ID for the iframe element with the selector "{selector}"',
  'no-tab':
    'Can\'t connect to a tab, use "New tab" or "Active tab" block before using the "{name}" block',
};

export default function ({ message, ...data }: LogMessageData) {
  const localeMessage = logMessages[message];
  if (localeMessage) {
    return localeMessage.replace(/\{(\w+)\}/g, (_, key) =>
      String(data[key] ?? `{${key}}`)
    );
  }

  return message;
}
