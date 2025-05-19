export function base64urlEncode(data: ArrayBuffer) {
  const base64Encoded = btoa(String.fromCharCode(...new Uint8Array(data)));
  const base64urlEncoded = base64Encoded
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '')
  return base64urlEncoded
}

export function base64urlToBase64(base64UrlEncoded: string): string {
  const base64Encoded = base64UrlEncoded
  .replace(/-/g, '+')
  .replace(/_/g, '/');
  return base64Encoded
}

export function base64ToBase64Url(base64Encoded: string): string {
  const base64UrlEncoded = base64Encoded
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '')
  return base64UrlEncoded
}

export function bytesToBase64(bytes: Uint8Array) {
  const binString = Array.from(bytes, (byte) =>
    String.fromCodePoint(byte),
  ).join("");
  return btoa(binString);
}

export function bytesFromBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
