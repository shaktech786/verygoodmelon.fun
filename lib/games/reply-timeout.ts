/**
 * How long a game waits on a written reply from the server before giving up and
 * falling back to its own way on. A reply that never comes must never hold a
 * player's words or controls hostage.
 */
export const REPLY_TIMEOUT_MS = 20_000

/** For small extras with a ready fallback, where waiting long adds nothing. */
export const EXTRA_TIMEOUT_MS = 10_000
