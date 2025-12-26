// crypto.randomUUID() requires secure context (HTTPS or localhost)
/** biome-ignore-all lint/suspicious/noBitwiseOperators: a */
// Fallback for HTTP access over LAN/Tailscale
export function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate v4-like UUID using Math.random
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
