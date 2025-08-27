/**
 * Compute SHA256 hash of a string or file in the browser
 */
export async function computeSHA256(content: string | File): Promise<string> {
  let data: ArrayBuffer;
  
  if (typeof content === 'string') {
    data = new TextEncoder().encode(content);
  } else {
    data = await content.arrayBuffer();
  }
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Format SHA256 for display with short and full versions
 */
export function formatSHA256(sha256: string, short: boolean = false): string {
  if (short) {
    return sha256.substring(0, 8);
  }
  return sha256;
}