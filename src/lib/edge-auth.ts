export interface EdgeTokenPayload {
  userId: string;
  name: string;
  email: string;
  role: string;
  registrationNumber?: string;
  exp?: number;
  iat?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'gurukul_kurukshetra_super_secret_jwt_key_2026_entrance_exam';
export const TOKEN_NAME = 'gurukul_auth_token';

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verifies a JWT token using standard Web Crypto API.
 * 100% compatible with Next.js Edge Runtime and Node.js without external dependencies.
 */
export async function verifyTokenInEdge(token: string): Promise<EdgeTokenPayload | null> {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode and parse payload
    const payloadJson = new TextDecoder().decode(base64UrlToUint8Array(payloadB64));
    const payload: EdgeTokenPayload = JSON.parse(payloadJson);

    // Check expiration timestamp
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }

    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sig = base64UrlToUint8Array(signatureB64);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('HMAC', key, sig as unknown as BufferSource, data);

    return isValid ? payload : null;
  } catch {
    return null;
  }
}
