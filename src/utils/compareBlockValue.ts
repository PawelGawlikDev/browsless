type CompareOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | '()';
const handlers: Record<CompareOperator, (a: unknown, b: unknown) => boolean> = {
  '==': (a, b) => a === b,
  '!=': (a, b) => a !== b,
  '>': (a, b) => (a as string | number) > (b as string | number),
  '>=': (a, b) => (a as string | number) >= (b as string | number),
  '<': (a, b) => (a as string | number) < (b as string | number),
  '<=': (a, b) => (a as string | number) <= (b as string | number),
  '()': (a, b) =>
    (
      a as {
        includes?: (value: unknown) => boolean;
      }
    )?.includes?.(b) ?? false,
};
const compareBlockValue = (type: string, valueA: unknown, valueB: unknown) => {
  const handler = handlers[type as CompareOperator];
  if (handler) return handler(valueA, valueB);
  return false;
};
export default compareBlockValue;
