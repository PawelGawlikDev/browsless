let id = 0;
export function useComponentId(prefix: string): string;
export function useComponentId(): number;
export function useComponentId(prefix?: string) {
  id += 1;
  if (!prefix) return id;
  return `${prefix}--${id}`;
}
