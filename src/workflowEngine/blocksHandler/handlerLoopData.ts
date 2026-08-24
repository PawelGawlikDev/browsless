import {
  getExtensionStorageValue,
  setExtensionStorageValue,
} from '@/lib/extensionStorage';
import objectPath from 'object-path';
import { parseJSON, isXPath } from '@/utils/helper';
import type {
  WorkflowHandlerBlock,
  WorkflowHandlerOptions,
  WorkflowHandlerContext,
} from '@/types/workflow-engine';

type LoopThrough =
  | 'numbers'
  | 'table'
  | 'custom-data'
  | 'data-columns'
  | 'google-sheets'
  | 'variable'
  | 'elements';

type LoopDataBlockData = {
  loopId: string;
  loopThrough: LoopThrough;
  maxLoop?: number;
  fromNumber?: number;
  toNumber?: number;
  startIndex?: number;
  resumeLastWorkflow?: boolean;
  reverseLoop?: boolean;
  loopData?: string;
  referenceKey?: string;
  variableName?: string;
  elementSelector?: string;
  waitForSelector?: boolean;
  waitSelectorTimeout?: number;
};

async function loopData(
  this: WorkflowHandlerContext,
  { data, id }: WorkflowHandlerBlock<LoopDataBlockData>,
  { refData }: WorkflowHandlerOptions
) {
  try {
    if (this.loopList[data.loopId]) {
      const index = this.loopList[data.loopId].index + 1;

      this.loopList[data.loopId].index = index;

      let currentLoopData: unknown;

      if (data.loopThrough === 'numbers') {
        currentLoopData =
          (refData.loopData[data.loopId] as { data?: unknown } | undefined)?.data !==
          undefined
            ? (refData.loopData[data.loopId] as { data: number }).data + 1
            : undefined;
      } else {
        currentLoopData = this.loopList[data.loopId].data[index];
      }

      refData.loopData[data.loopId] = {
        data: currentLoopData,
        $index: index,
      };
    } else {
      const maxLoop = +data.maxLoop || 0;
      const getLoopData: Record<string, () => unknown> = {
        numbers: () => data.fromNumber,
        table: () => refData.table,
        'custom-data': () => JSON.parse(data.loopData ?? ''),
        'data-columns': () => refData.table,
        'google-sheets': () =>
          (refData.googleSheets as Record<string, unknown>)?.[data.referenceKey ?? ''],
        variable: () => {
          let variableVal: unknown = objectPath.get(
            refData.variables as Record<string, unknown>,
            data.variableName ?? ''
          );

          if (Array.isArray(variableVal)) return variableVal;

          variableVal = parseJSON(variableVal as string, variableVal);

          switch (typeof variableVal) {
            case 'string':
              variableVal = variableVal.split('');
              break;
            case 'number':
              variableVal = Array.from({ length: variableVal }, (_, index) => index + 1);
              break;
            default:
          }

          return variableVal;
        },
        elements: async () => {
          const findBy = isXPath(data.elementSelector ?? '') ? 'xpath' : 'cssSelector';
          const { elements, url, loopId } = (await this._sendMessageToTab({
            id,
            label: 'loop-data',
            data: {
              findBy,
              max: maxLoop,
              multiple: true,
              reverseLoop: data.reverseLoop,
              selector: data.elementSelector,
              waitForSelector: data.waitForSelector ?? false,
              waitSelectorTimeout: data.waitSelectorTimeout ?? 5000,
            },
          })) as {
            elements: unknown[];
            url?: unknown;
            loopId?: string;
          };
          this.loopEls.push({
            url,
            loopId,
            findBy,
            max: maxLoop,
            blockId: id,
            selector: data.elementSelector,
          });

          return elements;
        },
      };

      const currLoopData = await getLoopData[data.loopThrough]();
      let index = 0;

      if (data.loopThrough !== 'numbers') {
        if (!Array.isArray(currLoopData)) {
          throw new Error('invalid-loop-data');
        }

        const startIndex = +data.startIndex;

        if (data.resumeLastWorkflow && this.engine.isPopup) {
          index =
            JSON.parse(
              String(
                (await getExtensionStorageValue<string>('local', `index:${id}`, '0')) ||
                  '0'
              )
            ) || 0;
        } else if (!Number.isNaN(startIndex) && startIndex > 0) {
          index = startIndex;
        }

        if (data.reverseLoop && data.loopThrough !== 'elements') {
          currLoopData.reverse();
        }
      }

      this.loopList[data.loopId] = {
        index,
        blockId: id,
        id: data.loopId,
        data: currLoopData as unknown[],
        type: data.loopThrough,
        maxLoop:
          data.loopThrough === 'numbers'
            ? (data.toNumber ?? 0) + 1 - (data.fromNumber ?? 0)
            : maxLoop,
      };

      refData.loopData[data.loopId] = {
        data: data.loopThrough === 'numbers' ? data.fromNumber : currLoopData[index],
        $index: index,
      };
      this.engine.addRefDataSnapshot('loopData');
    }

    if (this.engine.isPopup) {
      await setExtensionStorageValue(
        'local',
        `index:${id}`,
        JSON.stringify(this.loopList[data.loopId].index)
      );
    }

    return {
      data: refData.loopData[data.loopId],
      nextBlockId: this.getBlockConnections(id),
    };
  } catch (rawError) {
    const error = rawError as Error & { data?: Record<string, unknown> };
    if (data.loopThrough === 'elements') {
      error.data = { selector: data.elementSelector };
    }

    throw error;
  }
}

export default loopData;
