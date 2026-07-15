// Compact, URL-safe co-watch room token. A room key is 16 random bytes; the share token packs those bytes
// together with the host's gateway URL and Base64URL-encodes the whole binary packet — no BigInt and no
// decimal blow-up (16 random bytes stay 16 bytes, not a 39-digit string):
//   packet = [16 key bytes][utf8(gatewayUrl)]
//   token  = base64url(packet)
//   roomId = base64url(16 key bytes)   — the SignalR group id, derived from the same bytes
// Base64URL (A-Za-z0-9-_) is safe in a query value without escaping.

const KEY_BYTES = 16;

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(text: string): Uint8Array {
  const pad = text.length % 4 === 0 ? "" : "=".repeat(4 - (text.length % 4));
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// A fresh room key: 16 random bytes as a 22-char Base64URL string (SignalR group id + unguessable capability).
export function generateRoomKey(): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(KEY_BYTES)));
}

// token = base64url([key bytes] ++ utf8(gatewayUrl)).
export function buildShareToken(roomKey: string, gatewayUrl: string): string {
  const keyBytes = base64UrlToBytes(roomKey);
  const urlBytes = new TextEncoder().encode(gatewayUrl);
  const packet = new Uint8Array(keyBytes.length + urlBytes.length);
  packet.set(keyBytes, 0);
  packet.set(urlBytes, keyBytes.length);
  return bytesToBase64Url(packet);
}

export function parseShareToken(token: string): { roomKey: string; gatewayUrl: string } | null {
  let packet: Uint8Array;
  try {
    packet = base64UrlToBytes(token);
  } catch {
    return null;
  }
  if (packet.length <= KEY_BYTES) return null;
  const roomKey = bytesToBase64Url(packet.slice(0, KEY_BYTES));
  const gatewayUrl = new TextDecoder().decode(packet.slice(KEY_BYTES));
  if (!gatewayUrl) return null;
  return { roomKey, gatewayUrl };
}
