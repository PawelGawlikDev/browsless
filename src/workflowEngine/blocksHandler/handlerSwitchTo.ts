import { sleep } from '@/utils/helper';
import { getFrames } from '../helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerContext,
  WorkflowBlockResult,
} from '@/types/workflow-engine';

type SwitchToBlockData = {
  windowType: 'main-window' | 'iframe';
  selector?: string;
};

async function switchTo(
  this: WorkflowHandlerContext,
  block: WorkflowHandlerBlock<SwitchToBlockData>
) {
  const nextBlockId = this.getBlockConnections(block.id);

  try {
    if (block.data.windowType === 'main-window') {
      this.activeTab.frameId = 0;

      delete this.frameSelector;

      return {
        data: '',
        nextBlockId,
      } satisfies WorkflowBlockResult;
    }

    const { url, isSameOrigin } = (await this._sendMessageToTab(
      block as unknown as Record<string, unknown>,
      { frameId: 0 }
    )) as { url?: string; isSameOrigin?: boolean };

    if (isSameOrigin) {
      this.frameSelector = block.data.selector;

      return {
        data: block.data.selector,
        nextBlockId,
      } satisfies WorkflowBlockResult;
    }

    if (!this.activeTab.id) throw new Error('no-tab');

    const frames = await getFrames(this.activeTab.id);
    const frameUrl = url ?? '';

    let frameId = frames[frameUrl] ?? null;
    if (frameId === null) {
      // Incase the iframe is redirect
      frameId =
        Object.entries(frames).find(([frameURL]) => {
          try {
            const currFramePathName = new URL(frameUrl).pathname;
            const framePathName = new URL(frameURL).pathname;

            return currFramePathName === framePathName;
          } catch {
            return false;
          }
        })?.[1] ?? null;
    }

    if (frameId !== null) {
      this.activeTab.frameId = frameId;

      await sleep(1000);

      return {
        nextBlockId,
        data: this.activeTab.frameId,
      } satisfies WorkflowBlockResult;
    }

    throw new Error('no-iframe-id');
  } catch (rawError) {
    const error = rawError as Error & {
      data?: Record<string, unknown>;
      nextBlockId?: unknown;
    };
    error.data = { selector: block.data.selector };
    error.nextBlockId = nextBlockId;

    throw error;
  }
}

export default switchTo;
