import type { SerializedFunctionMarker, SerializedValue } from '@/types/runtime';
const isSerializedFunctionMarker = (
  value: unknown
): value is SerializedFunctionMarker => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__type' in value &&
    '__value' in value &&
    (value as SerializedFunctionMarker).__type === 'function'
  );
};
export const serializeFunctions = (obj: unknown): SerializedValue => {
  if (typeof obj === 'function') {
    return {
      __type: 'function',
      __value: obj.toString(),
    };
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFunctions(item));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, SerializedValue> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = serializeFunctions((obj as Record<string, unknown>)[key]);
      }
    }
    return result;
  }
  return obj as SerializedValue;
};
export const deserializeFunctions = <T = unknown>(obj: SerializedValue): T => {
  if (obj && typeof obj === 'object') {
    if (isSerializedFunctionMarker(obj)) {
      return new Function('return ' + obj.__value)() as T;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => deserializeFunctions(item)) as T;
    }
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = deserializeFunctions((obj as Record<string, SerializedValue>)[key]);
      }
    }
    return result as T;
  }
  return obj as SerializedValue as T;
};
