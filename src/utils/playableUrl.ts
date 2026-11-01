/**
 * URLs the player can load directly. Anything else — empty strings,
 * relative paths, plugin-internal handles like `online-balancers://kodik/serial-4898` —
 * is an identifier, not a stream, and must never reach the video element.
 */
export const isPlayableUrl = (url: unknown): url is string =>
  typeof url === "string" && /^https?:\/\//i.test(url);
