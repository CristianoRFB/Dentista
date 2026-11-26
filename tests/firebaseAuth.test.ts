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
    const token = await new SignJWT({ auth_time: Math.floor(Date.now() / 1000) - 60, firebase: { sign_in_provider: 'password' } })
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
    const base = new SignJWT({ auth_time: Math.floor(Date.now() / 1000) - 60 }).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer(issuer).setAudience(projectId).setSubject('dentist-a').setIssuedAt().setExpirationTime('5m');
    const good = await base.sign(pair.privateKey);
    const wrongIssuer = await new SignJWT({ auth_time: Math.floor(Date.now() / 1000) - 60 }).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer('https://securetoken.google.com/other-project').setAudience(projectId).setSubject('dentist-a')
      .setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
    const wrongSignature = await new SignJWT({ auth_time: Math.floor(Date.now() / 1000) - 60 }).setProtectedHeader({ alg: 'RS256', kid: 'firebase-test' })
      .setIssuer(issuer).setAudience(projectId).setSubject('dentist-a').setIssuedAt().setExpirationTime('5m')
      .sign(wrongPair.privateKey);
    await expect(verify(good, 'other-project')).rejects.toThrow();
    await expect(verify(wrongIssuer, projectId)).rejects.toThrow();
    await expect(verify(wrongSignature, projectId)).rejects.toThrow();
  });

  it('recusa claims ausentes, temporais inválidas, audience múltipla, UID inválido e kid ausente', async () => {
    const pair = await generateKeyPair('RS256');
    const jwks = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'firebase-test', alg: 'RS256', use: 'sig' }] });
    const verify = createFirebaseTokenVerifier(jwks as never);
    const now = Math.floor(Date.now() / 1000);
    const valid = { iss: issuer, aud: projectId, sub: 'dentist-a', iat: now - 10, auth_time: now - 60, exp: now + 300 };
    const sign = (claims: Record<string, unknown>, kid = true) => new SignJWT(claims)
      .setProtectedHeader(kid ? { alg: 'RS256', kid: 'firebase-test' } : { alg: 'RS256' }).sign(pair.privateKey);
    await expect(verify(await sign(valid), projectId)).resolves.toEqual({ uid: 'dentist-a' });
    for (const claim of ['exp', 'iat', 'auth_time', 'sub']) {
      const missing: Record<string, unknown> = { ...valid };
      delete missing[claim];
      await expect(verify(await sign(missing), projectId)).rejects.toThrow();
    }
    for (const invalid of [
      { exp: now - 1 }, { iat: now + 60 }, { auth_time: now + 60 },
      { auth_time: now - 5 }, { auth_time: 'invalid' }, { iat: 'invalid' },
      { auth_time: 0 }, { exp: now + 0.5 }, { aud: [projectId, 'other'] },
      { sub: ' ' }, { sub: 'a'.repeat(129) },
    ]) {
      await expect(verify(await sign({ ...valid, ...invalid }), projectId)).rejects.toThrow();
    }
    await expect(verify(await sign(valid, false), projectId)).rejects.toThrow();
    const ps = await generateKeyPair('PS256');
    const psKeys = createLocalJWKSet({ keys: [{ ...await exportJWK(ps.publicKey), kid: 'ps-key', alg: 'PS256', use: 'sig' }] });
    const psToken = await new SignJWT(valid).setProtectedHeader({ alg: 'PS256', kid: 'ps-key' }).sign(ps.privateKey);
    await expect(createFirebaseTokenVerifier(psKeys as never)(psToken, projectId)).rejects.toThrow();
  });
});
