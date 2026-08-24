let id = 0;
export const useComponentId = (prefix?: string) => {
  id += 1;
  if (!prefix) return id;
  return `${prefix}--${id}`;
};
