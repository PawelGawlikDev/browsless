import BrowserAPIService from '@/service/browser-api/BrowserAPIService';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';
import { nanoid } from 'nanoid';

type NotificationBlockData = {
  title?: string;
  message?: string;
  iconUrl?: string;
  imageUrl?: string;
};

export default async function (
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<NotificationBlockData>
) {
  const hasPermission = await BrowserAPIService.permissions.contains({
    permissions: ['notifications'],
  });

  if (!hasPermission) {
    const error = new Error('no-permission');
    (error as Error & { data?: { permission: string } }).data = {
      permission: 'notifications',
    };

    throw error;
  }

  const options: {
    title?: string;
    message?: string;
    iconUrl: string;
    imageUrl?: string;
  } = {
    title: data.title,
    message: data.message,
    iconUrl: chrome.runtime.getURL('icon-128.png'),
  };

  (['iconUrl', 'imageUrl'] as const).forEach((key) => {
    const url = data[key];
    if (!url || !url.startsWith('http')) return;

    options[key] = url;
  });

  await BrowserAPIService.notifications.create(nanoid(), {
    ...options,
    type: options.imageUrl ? 'image' : 'basic',
  });

  return {
    data: '',
    nextBlockId: this.getBlockConnections(id),
  };
}
