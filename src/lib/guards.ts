/** Small type guards and sanitizers shared by the validators. */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Control characters except tab and newline. */
// eslint-disable-next-line no-control-regex
export const CONTROL_CHARS = /[\u0000-\u0008\u000b-\u001f\u007f]/g
