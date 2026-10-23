import { generateKeyPairSync, sign, randomUUID } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
export const TEST_GOOGLE_CLIENT_ID = '123456-tixflow-test.apps.googleusercontent.com';
export function googleTokenFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const client = new OAuth2Client();
  type CertReply = Awaited<ReturnType<OAuth2Client['getFederatedSignonCertsAsync']>>;
  // Substitute only Google's network certificate source, never JWT verification.
  client.getFederatedSignonCertsAsync = async () => ({
    certs: { fixture: publicKey.export({ type: 'spki', format: 'pem' }).toString() },
    format: 'PEM' as CertReply['format'],
  });
  function token(patch: Record<string, unknown> = {}) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'https://accounts.google.com',
      aud: TEST_GOOGLE_CLIENT_ID,
      iat: now,
      exp: now + 300,
      sub: randomUUID(),
      email: `${randomUUID()}@google-fixture.test`,
      email_verified: true,
      name: 'Google Fixture',
      nonce: 'n'.repeat(43),
      ...patch,
    };
    const header = Buffer.from(
        JSON.stringify({ alg: 'RS256', kid: 'fixture', typ: 'JWT' }),
      ).toString('base64url'),
      body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const data = `${header}.${body}`;
    return `${data}.${sign('RSA-SHA256', Buffer.from(data), privateKey).toString('base64url')}`;
  }
  return { client, token };
}
