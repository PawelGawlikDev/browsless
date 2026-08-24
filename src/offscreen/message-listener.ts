import BrowserAPIEventHandler from '@/service/browser-api/BrowserAPIEventHandler';
import { MessageListener } from '@/utils/message';
import WorkflowManager from '@/workflowEngine/WorkflowManager';
import { browser as Browser } from 'wxt/browser';
import type { WorkflowNode } from '@/types/models';

type WorkflowExecutePayload = {
  workflow: WorkflowNode | Record<string, unknown>;
  options?: Record<string, unknown>;
};

type WorkflowResumePayload = {
  id: string;
  nextBlock: WorkflowNode | Record<string, unknown>;
};

type WorkflowUpdatePayload = {
  id: string;
  data: Record<string, unknown>;
};

const messageListener = new MessageListener('offscreen');
Browser.runtime.onMessage.addListener(messageListener.listener);

messageListener.on<WorkflowExecutePayload>(
  'workflow:execute',
  ({ workflow, options }) => {
    WorkflowManager.instance.execute(workflow, options);
  }
);

messageListener.on<string>('workflow:stop', (stateId) => {
  WorkflowManager.instance.stopExecution(stateId);
});

messageListener.on<WorkflowResumePayload>('workflow:resume', ({ id, nextBlock }) => {
  WorkflowManager.instance.resumeExecution(id, nextBlock);
});

messageListener.on<WorkflowUpdatePayload>('workflow:update', ({ id, data }) => {
  WorkflowManager.instance.updateExecution(id, data);
});

messageListener.on(BrowserAPIEventHandler.RuntimeEvents.ON_EVENT, (event) =>
  BrowserAPIEventHandler.instance.onBrowserEventListener(event)
);
