export type TableDataType = 'any' | 'string' | 'integer' | 'boolean' | 'array';

export const dataTypes: Array<{ id: TableDataType; name: string }> = [
  { id: 'any', name: 'Any' },
  { id: 'string', name: 'Text' },
  { id: 'integer', name: 'Number' },
  { id: 'boolean', name: 'Boolean' },
  { id: 'array', name: 'Array' },
];
