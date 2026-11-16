/**
 * The one way a feature turns a thrown value into visible copy.
 *
 * Every controller rendered `cause instanceof Error ? cause.message : fallback`
 * inline, which let truncation and fallback text drift between panels. The
 * caller still owns the fallback sentence, because that is domain language.
 */

const MAX_MESSAGE_LENGTH = 240;

export function errorMessage(cause: unknown, fallback: string): string {
  if (!(cause instanceof Error)) return fallback;
  const message = cause.message.trim();
  return message.length === 0 ? fallback : message.slice(0, MAX_MESSAGE_LENGTH);
}
