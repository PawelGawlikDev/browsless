/** Narrow untrusted object data without asserting a domain-specific shape. */
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Keep array elements unknown until each element has been validated. */
export const isUnknownArray = (value: unknown): value is unknown[] =>
  Array.isArray(value);
