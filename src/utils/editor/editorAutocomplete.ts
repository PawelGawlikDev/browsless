import { getBlocks } from '../getSharedData';
type AutocompleteEntry = Record<string, Record<string, string>>;
type AutocompleteStore = Record<string, AutocompleteEntry>;
type BlockData = Record<string, any>;
const blocks = getBlocks();
const autocompleteKeys: Record<string, string> = {
  loopId: 'loopData',
  refKey: 'googleSheets',
  variableName: 'variables',
};
const getData = (blockName: string, blockData: BlockData): AutocompleteEntry => {
  const keys = blocks[blockName]?.autocomplete as string[] | undefined;
  const dataList: AutocompleteEntry = {};
  if (!keys) return dataList;
  keys.forEach((key) => {
    const value = blockData[key];
    if (!value) return;
    const autocompleteKey = autocompleteKeys[key];
    if (!autocompleteKey) return;
    if (!dataList[autocompleteKey]) dataList[autocompleteKey] = {};
    dataList[autocompleteKey][String(value)] = '';
  });
  return dataList;
};
const extractBlocksAutocomplete: Record<
  string,
  (this: AutocompleteStore, blockId: string, data: BlockData) => void
> = {
  trigger(blockId, data) {
    if (!this[blockId]) this[blockId] = {};
    if (!this[blockId].variables) this[blockId].variables = {};
    (
      data.parameters as
        | {
            name: string;
          }[]
        | undefined
    )?.forEach((param) => {
      this[blockId].variables[param.name] = '';
    });
    if (data.type === 'context-menu') {
      Object.assign(this[blockId].variables, {
        $ctxElSelector: '',
        $ctxTextSelection: '',
        $ctxLink: '',
        $ctxMediaUrl: '',
      });
    }
  },
  'blocks-group': function (blockId, data) {
    if (!this[blockId]) this[blockId] = {};
    (
      data.blocks as {
        id: string;
        itemId: string;
        data: BlockData;
      }[]
    ).forEach((block) => {
      this[block.itemId] = getData(block.id, block.data);
    });
  },
  'insert-data': function (blockId, data) {
    if (!this[blockId]) this[blockId] = {};
    if (!this[blockId].variables) this[blockId].variables = {};
    (
      data.dataList as {
        type: string;
        name: string;
      }[]
    ).forEach((item) => {
      if (item.type !== 'variable' || !item.name.trim()) return;
      this[blockId].variables[item.name] = '';
    });
  },
};
export default function (
  label: string,
  {
    data,
    id,
  }: {
    data: BlockData;
    id: string;
  }
): AutocompleteStore {
  const autocompleteData: AutocompleteStore = { [id]: {} };
  if (extractBlocksAutocomplete[label]) {
    extractBlocksAutocomplete[label].call(autocompleteData, id, data);
  } else {
    autocompleteData[id] = getData(label, data);
  }
  return autocompleteData;
}
