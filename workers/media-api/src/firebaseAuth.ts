import { createRemoteJWKSet, jwtVerify } from 'jose';

interface FirebaseIdentity { uid: string; }

const firebaseJwks = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));

export function createFirebaseTokenVerifier(jwks: typeof firebaseJwks = firebaseJwks) {
  return async function verifyFirebaseIdToken(token: string, projectId: string): Promise<FirebaseIdentity> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: 'https://securetoken.google.com/' + projectId,
      audience: projectId,
    });
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('invalid_sub');
    return { uid: payload.sub };
  };
}

export const verifyFirebaseIdToken = createFirebaseTokenVerifier();
