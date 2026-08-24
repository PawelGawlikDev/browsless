import { extensionStorage } from '@/lib/extensionStorage';
import type { ContextMenuMessagePayload, WorkflowWithTrigger } from '@/types/background';
import type { DrawflowData, WorkflowNode } from '@/types/models';
import type { TriggerBlockData, VisitWebTriggerItem } from '@/types/runtime';
import { browser } from 'wxt/browser';
import dayjs from 'dayjs';
import { findTriggerBlock, parseJSON } from '@/utils/helper';
import {
  registerCronJob,
  registerSpecificDay,
  registerWorkflowTrigger,
} from '@/utils/workflowTrigger';
import BackgroundWorkflowUtils from './BackgroundWorkflowUtils';

class BackgroundWorkflowTriggers {
  static async visitWebTriggers(tabId: number, tabUrl: string, spa = false) {
    const { visitWebTriggers } = await extensionStorage.local.get('visitWebTriggers');
    const triggers = (visitWebTriggers as VisitWebTriggerItem[] | null | undefined) || [];
    if (triggers.length === 0) return;

    const triggeredWorkflow = triggers.find(({ url, isRegex, supportSPA }) => {
      if (!url.trim() || (spa && !supportSPA)) return false;

      return tabUrl.match(isRegex ? new RegExp(url, 'g') : url);
    });

    if (triggeredWorkflow) {
      let workflowId = triggeredWorkflow.id;
      if (triggeredWorkflow.id.startsWith('trigger')) {
        const { 1: triggerWorkflowId } = triggeredWorkflow.id.split(':');
        workflowId = triggerWorkflowId;
      }

      const workflowData = await BackgroundWorkflowUtils.getWorkflow(workflowId);
      if (workflowData) {
        BackgroundWorkflowUtils.instance.executeWorkflow(workflowData, {
          tabId,
        });
      }
    }
  }

  static async scheduleWorkflow({ name }: chrome.alarms.Alarm) {
    try {
      let workflowId = name;
      let triggerId = null;

      if (name.startsWith('trigger')) {
        const { 1: triggerWorkflowId, 2: triggerItemId } = name.split(':');
        triggerId = triggerItemId;
        workflowId = triggerWorkflowId;
      }

      const currentWorkflow = (await BackgroundWorkflowUtils.getWorkflow(
        workflowId
      )) as WorkflowWithTrigger | null;
      if (!currentWorkflow) return;

      let data = currentWorkflow.trigger as TriggerBlockData | undefined | null;
      if (!data) {
        const drawflow =
          typeof currentWorkflow.drawflow === 'string'
            ? parseJSON<DrawflowData>(currentWorkflow.drawflow, {} as DrawflowData)
            : currentWorkflow.drawflow;
        const { data: triggerBlockData } =
          (findTriggerBlock(drawflow) as WorkflowNode | null) || {};
        data = triggerBlockData;
      }

      if (triggerId && data && Array.isArray(data.triggers)) {
        const triggerEntry = data.triggers.find((trigger) => trigger.id === triggerId);
        if (triggerEntry)
          data = { ...triggerEntry, ...triggerEntry.data } as TriggerBlockData;
      }

      if (data && data.type === 'interval' && data.fixedDelay) {
        const { workflowStates } = await extensionStorage.local.get('workflowStates');
        const workflowState = (
          (workflowStates as Array<{ workflowId?: string }> | null | undefined) || []
        ).find((item) => item.workflowId === workflowId);

        if (workflowState) {
          let { workflowQueue } = await extensionStorage.local.get('workflowQueue');
          workflowQueue = (workflowQueue as string[] | null | undefined) || [];

          if (!workflowQueue.includes(workflowId)) {
            (workflowQueue = workflowQueue || []).push(workflowId);
            await extensionStorage.local.set({ workflowQueue });
          }

          return;
        }
      } else if (data && data.type === 'date' && data.time && data.date) {
        const [hour, minute, second] = String(data.time).split(':');
        const date = dayjs(String(data.date))
          .hour(Number(hour))
          .minute(Number(minute))
          .second(Number(second || 0));

        const isAfter = dayjs(Date.now() - 60 * 1000).isAfter(date);
        if (isAfter) return;
      }

      BackgroundWorkflowUtils.instance.executeWorkflow(currentWorkflow);

      if (!data) return;

      if (['specific-day', 'cron-job'].includes(data.type)) {
        if (data.type === 'specific-day') {
          registerSpecificDay(name, data);
        } else {
          registerCronJob(name, data);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }

  static async contextMenu(
    { parentMenuItemId, menuItemId, frameId }: chrome.contextMenus.OnClickData,
    tab?: chrome.tabs.Tab
  ) {
    try {
      if (parentMenuItemId !== 'browslessContextMenu' || typeof tab?.id !== 'number')
        return;
      const message = (await browser.tabs.sendMessage(
        tab.id,
        {
          type: 'context-element',
        },
        { frameId }
      )) as ContextMenuMessagePayload;

      let workflowId = menuItemId;
      const menuId = String(menuItemId);
      if (menuId.startsWith('trigger')) {
        const { 1: triggerWorkflowId } = menuId.split(':');
        workflowId = triggerWorkflowId;
      }

      const workflowData = await BackgroundWorkflowUtils.getWorkflow(String(workflowId));
      if (!workflowData) return;

      BackgroundWorkflowUtils.instance.executeWorkflow(workflowData, {
        data: {
          variables: message,
        },
      });
    } catch (error) {
      console.error(error);
    }
  }

  static async reRegisterTriggers(isStartup = false) {
    const { workflows } = await extensionStorage.local.get(['workflows']);
    const convertToArr = (
      value: WorkflowWithTrigger[] | Record<string, WorkflowWithTrigger>
    ) => (Array.isArray(value) ? value : Object.values(value));

    const workflowsArr = convertToArr(
      ((workflows as
        WorkflowWithTrigger[] | Record<string, WorkflowWithTrigger> | null | undefined) ||
        []) as WorkflowWithTrigger[] | Record<string, WorkflowWithTrigger>
    );

    for (const currWorkflow of workflowsArr) {
      if (currWorkflow.isDisabled) continue;

      let triggerBlock = currWorkflow.trigger;

      if (!triggerBlock) {
        const flow =
          typeof currWorkflow.drawflow === 'string'
            ? parseJSON<DrawflowData>(currWorkflow.drawflow, {} as DrawflowData)
            : currWorkflow.drawflow;

        triggerBlock = (findTriggerBlock(flow) as WorkflowNode | null)?.data as
          TriggerBlockData | undefined;
      }

      if (triggerBlock) {
        if (isStartup && triggerBlock.type === 'on-startup') {
          BackgroundWorkflowUtils.instance.executeWorkflow(currWorkflow);
        } else {
          if (isStartup && triggerBlock.triggers) {
            for (const trigger of triggerBlock.triggers) {
              if (trigger.type === 'on-startup') {
                await BackgroundWorkflowUtils.instance.executeWorkflow(currWorkflow);
              }
            }
          }

          await registerWorkflowTrigger(currWorkflow.id, {
            id: 'trigger',
            label: 'trigger',
            type: 'BlockBasic',
            position: { x: 0, y: 0 },
            data: triggerBlock,
          });
        }
      }
    }
  }
}

export default BackgroundWorkflowTriggers;
