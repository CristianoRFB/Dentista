import { createRemoteJWKSet, jwtVerify } from 'jose';

interface FirebaseIdentity { uid: string; }

const firebaseJwks = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));

export function createFirebaseTokenVerifier(jwks: typeof firebaseJwks = firebaseJwks) {
  return async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseIdentity> {
    const { payload, protectedHeader } = await jwtVerify(token, jwks, {
      algorithms: ['RS256'],
      issuer: 'https://securetoken.google.com/' + projectId,
      audience: projectId,
      requiredClaims: ['exp', 'iat', 'auth_time', 'sub'],
    });
    const now = Math.floor(Date.now() / 1000);
    if (typeof protectedHeader.kid !== 'string' || !protectedHeader.kid.trim()) throw new Error('invalid_kid');
    if (payload.aud !== projectId) throw new Error('invalid_audience');
    if (typeof payload.sub !== 'string' || !payload.sub.trim() || payload.sub.length > 128) throw new Error('invalid_sub');
    if (typeof payload.exp !== 'number' || !Number.isSafeInteger(payload.exp) || payload.exp <= now
      || typeof payload.iat !== 'number' || !Number.isSafeInteger(payload.iat) || payload.iat <= 0 || payload.iat > now
      || typeof payload.auth_time !== 'number' || !Number.isSafeInteger(payload.auth_time)
      || payload.auth_time <= 0 || payload.auth_time > payload.iat || payload.exp <= payload.iat) {
      throw new Error('invalid_token_time');
    }
    return { uid: payload.sub };
  };
}

export const verifyFirebaseIdToken = createFirebaseTokenVerifier();
