/**
 * Size limits shared by the browser, the stored-data validators and the
 * server, so a value the UI allows is never rejected by the API.
 */

/** One journal entry or chat message, in characters. */
export const MAX_TEXT_LENGTH = 4000
/** Chat turns the server reads (and the client sends). */
export const MAX_HISTORY = 20
/** Quick-pick tags per check-in, and their length. */
export const MAX_TAGS = 12
export const MAX_TAG_LENGTH = 40
