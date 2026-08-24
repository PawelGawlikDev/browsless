import { browser } from 'wxt/browser';
import dayjs from '@/lib/dayjs';
import type { TriggerBlockData } from '@/types/runtime';
import { getReadableShortcut } from '@/composable/shortcut';
const triggerText = async (
  trigger: TriggerBlockData | null | undefined,
  t: (key: string, ...args: unknown[]) => string,
  workflowId: string,
  includeManual = false
) => {
  if (!trigger || (trigger.type === 'manual' && !includeManual)) return null;
  const triggerLocale = t('workflow.blocks.trigger.name');
  if (trigger.type === 'manual') {
    return `${triggerLocale}: ${t('workflow.blocks.trigger.items.manual')}`;
  }
  const triggerName = t(`workflow.blocks.trigger.items.${trigger.type}`);
  let text = '';
  if (trigger.type === 'keyboard-shortcut') {
    text = getReadableShortcut(String(trigger.shortcut || ''));
  } else if (trigger.type === 'visit-web') {
    text = String(trigger.url || '');
  } else if (['specific-day', 'date'].includes(trigger.type)) {
    const triggerTime = (await browser.alarms.get(workflowId))?.scheduledTime;
    text = dayjs(triggerTime || Date.now()).format('DD-MMM-YYYY, hh:mm A');
  }
  text = text && `: \n ${text}`;
  return `${triggerLocale} (${triggerName})${text}`;
};
export default triggerText;
