import { describe, expect, it } from 'vitest';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createFirebaseTokenVerifier } from '../workers/media-api/src/firebaseAuth';

const projectId = 'demo-odontoflow';
const issuer = `https://securetoken.google.com/${projectId}`;

describe('verificação de Firebase ID token no Worker', () => {
  it('aceita assinatura, issuer, audience e subject correspondentes', async () => {
    const { publicKey, privateKey } = await generateKeyPair('RS256');
    const jwks = createLocalJWKSet({ keys: [{ ...await exportJWK(publicKey), kid: 'firebase-test', alg: 'RS256', use: 'sig' }] });
    const verify = createFirebaseTokenVerifier(jwks as never);
    const token = await new SignJWT({ firebase: { sign_in_provider: 'password' } })
      .setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer(issuer)
      .setAudience(projectId)
      .setSubject('dentist-a')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
    await expect(verify(token, projectId)).resolves.toEqual({ uid: 'dentist-a' });
  });

  it('recusa projectId/issuer divergente e assinatura inválida', async () => {
    const pair = await generateKeyPair('RS256');
    const wrongPair = await generateKeyPair('RS256');
    const jwks = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'firebase-test', alg: 'RS256', use: 'sig' }] });
    const verify = createFirebaseTokenVerifier(jwks as never);
    const base = new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer(issuer).setAudience(projectId).setSubject('dentist-a').setIssuedAt().setExpirationTime('5m');
    const good = await base.sign(pair.privateKey);
    const wrongIssuer = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer('https://securetoken.google.com/other-project').setAudience(projectId).setSubject('dentist-a')
      .setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
    const wrongSignature = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer(issuer).setAudience(projectId).setSubject('dentist-a').setIssuedAt().setExpirationTime('5m')
      .sign(wrongPair.privateKey);
    await expect(verify(good, 'other-project')).rejects.toThrow();
    await expect(verify(wrongIssuer, projectId)).rejects.toThrow();
    await expect(verify(wrongSignature, projectId)).rejects.toThrow();
  });
});
