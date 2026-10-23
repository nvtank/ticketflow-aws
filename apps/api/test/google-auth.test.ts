import 'reflect-metadata';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { googleTokenFixture, TEST_GOOGLE_CLIENT_ID } from './google-token-fixture';
import type * as Verifier from '../src/auth/google/google-token-verifier';
import type * as Env from '../src/config/environment';
import type * as Password from '../src/auth/password.service';
const require = createRequire(import.meta.url);
const { GoogleTokenVerifier } =
  require('../dist/auth/google/google-token-verifier.js') as typeof Verifier;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof Env;
const { PasswordService } = require('../dist/auth/password.service.js') as typeof Password;
const fixture = googleTokenFixture();
const env = parseEnvironment({ ...process.env, GOOGLE_CLIENT_ID: TEST_GOOGLE_CLIENT_ID });
const verifier = new GoogleTokenVerifier(env, fixture.client),
  nonce = 'n'.repeat(43);
describe('Google ID token verification using real RSA and official SDK', () => {
  it('verifies signature audience issuer expiry nonce and verified email', async () => {
    const token = fixture.token({ sub: 'google-subject', email: 'PERSON@EXAMPLE.COM' });
    expect(await verifier.verify(token, nonce)).toMatchObject({
      subject: 'google-subject',
      email: 'person@example.com',
      name: 'Google Fixture',
    });
  });
  it.each([
    { aud: 'another-client' },
    { iss: 'https://attacker.invalid' },
    { exp: Math.floor(Date.now() / 1000) - 3600 },
    { email_verified: false },
    { nonce: 'other'.repeat(10) },
    { nonce: undefined },
    { sub: '' },
    { email: 'invalid' },
  ])('rejects invalid signed claims %j', async (patch) => {
    await expect(verifier.verify(fixture.token(patch), nonce)).rejects.toThrow();
  });
  it('rejects modified signature and unknown kid', async () => {
    const token = fixture.token();
    const parts = token.split('.');
    parts[2] = (parts[2]![0] === 'A' ? 'B' : 'A') + parts[2]!.slice(1);
    await expect(verifier.verify(parts.join('.'), nonce)).rejects.toThrow();
    parts[0] = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'unknown' })).toString('base64url');
    await expect(verifier.verify(parts.join('.'), nonce)).rejects.toThrow();
  });
  it('does not authenticate a Google-only account with the dummy bcrypt password', async () => {
    const passwords = new PasswordService();
    expect(await passwords.verify('never-a-user-password', null)).toBe(false);
    expect(await passwords.verify('never-a-user-password', undefined)).toBe(false);
  });
  it('disables Google without a configured Web client ID', async () => {
    const disabled = parseEnvironment({ ...process.env, GOOGLE_CLIENT_ID: '' });
    expect(disabled.GOOGLE_CLIENT_ID).toBeUndefined();
    await expect(
      new GoogleTokenVerifier(disabled, fixture.client).verify(fixture.token(), nonce),
    ).rejects.toThrow('chưa được cấu hình');
  });
  it('rejects malformed client configuration without exposing it', () =>
    expect(() =>
      parseEnvironment({ ...process.env, GOOGLE_CLIENT_ID: 'not-a-client-secret' }),
    ).toThrow('GOOGLE_CLIENT_ID'));
});
