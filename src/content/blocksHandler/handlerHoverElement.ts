import { sendMessage } from '@/utils/message';
import { getElementPosition } from '../utils';
import handleSelector from '../handleSelector';
import type { SelectorBlock } from '@/types/migration-helpers';
const eventClick = (
  block: SelectorBlock & {
    activeTabId?: number;
  }
) => {
  return new Promise<string>((resolve, reject) => {
    handleSelector(block, {
      async onSelected(element) {
        const { x, y } = await getElementPosition(element);
        const payload = {
          tabId: block.activeTabId,
          method: 'Input.dispatchMouseEvent',
          params: {
            x,
            y,
            clickCount: 1,
            button: 'left',
            type: 'mousePressed',
          },
        };
        await sendMessage('debugger:send-command', payload, 'background');
      },
      onError(error) {
        reject(error);
      },
      onSuccess() {
        resolve('');
      },
    });
  });
};
export default eventClick;
