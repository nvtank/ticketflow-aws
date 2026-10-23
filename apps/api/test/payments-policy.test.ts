import type * as PayOSModule from '../src/payments/providers/payos.provider';
import type * as EnvironmentModule from '../src/config/environment';
import type * as CredentialModule from '../src/tickets/ticket-credential';
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
const require = createRequire(import.meta.url);
const { PayOSPaymentProvider } =
  require('../dist/payments/providers/payos.provider.js') as typeof PayOSModule;
const { parseEnvironment } = require('../dist/config/environment.js') as typeof EnvironmentModule;
const { ticketCredential, verifyTicketCredential, credentialHash } =
  require('../dist/tickets/ticket-credential.js') as typeof CredentialModule;
const key = 'f'.repeat(64);
const env = parseEnvironment({
  ...process.env,
  PAYMENT_PROVIDER: 'payos',
  PAYOS_CLIENT_ID: 'unit-client',
  PAYOS_API_KEY: 'unit-api',
  PAYOS_CHECKSUM_KEY: key,
});
function signature(data: Record<string, unknown>) {
  return createHmac('sha256', key)
    .update(
      Object.keys(data)
        .sort()
        .map(
          (k) =>
            `${k}=${data[k] === null ? '' : Array.isArray(data[k]) ? JSON.stringify(data[k]) : String(data[k])}`,
        )
        .join('&'),
    )
    .digest('hex');
}
const data = {
  orderCode: 12345,
  amount: 1200000,
  description: 'Fixture',
  accountNumber: '12345',
  reference: 'unit-ref',
  transactionDateTime: '2026-10-23 15:00:00',
  currency: 'VND',
  paymentLinkId: 'unit-link',
  code: '00',
  desc: 'success',
};
const webhook = () => ({
  code: '00',
  desc: 'success',
  success: true,
  data: { ...data },
  signature: signature(data),
});
afterEach(() => vi.unstubAllGlobals());
describe('PayOS SDK signature contract', () => {
  it('accepts a valid HMAC payload and preserves unknown signed fields', async () => {
    const p = new PayOSPaymentProvider(env),
      body = webhook();
    const extra = { ...body.data, extraProviderField: 'preserved' };
    expect(
      await p.verifyWebhook({ ...body, data: extra, signature: signature(extra) }),
    ).toMatchObject({
      provider: 'payos',
      status: 'SUCCEEDED',
      amountVnd: 1200000,
      orderCode: 12345,
    });
  });
  it.each(['amount', 'currency', 'paymentLinkId'])(
    'rejects tampering with signed %s',
    async (field) => {
      const body = webhook();
      (body.data as Record<string, unknown>)[field] = field === 'amount' ? 1 : 'tampered';
      await expect(new PayOSPaymentProvider(env).verifyWebhook(body)).rejects.toThrow('Chữ ký');
    },
  );
  it('rejects malformed and unsigned payloads', async () => {
    const p = new PayOSPaymentProvider(env);
    await expect(p.verifyWebhook({})).rejects.toThrow();
    await expect(p.verifyWebhook({ ...webhook(), signature: '0'.repeat(64) })).rejects.toThrow(
      'Chữ ký',
    );
  });
  it('uses signed data.code rather than unsigned wrapper flags', async () => {
    const body = webhook(),
      changed = { ...body.data, code: '99' };
    expect(
      (
        await new PayOSPaymentProvider(env).verifyWebhook({
          ...body,
          data: changed,
          signature: signature(changed),
        })
      ).status,
    ).toBe('PENDING');
  });
  it('rejects negative and unsafe numeric input', async () => {
    const p = new PayOSPaymentProvider(env);
    for (const extra of [{ amount: -1 }, { orderCode: Number.MAX_SAFE_INTEGER + 1 }]) {
      const changed = { ...data, ...extra };
      await expect(
        p.verifyWebhook({ ...webhook(), data: changed, signature: signature(changed) }),
      ).rejects.toThrow('Dữ liệu');
    }
  });
  it('verifies signed API status responses and ignores a forged paid response', async () => {
    const link = {
      id: 'unit-link',
      orderCode: 12345,
      amount: 1200000,
      amountPaid: 1200000,
      amountRemaining: 0,
      status: 'PAID',
      createdAt: '2026-10-23',
      transactions: [],
      cancellationReason: null,
      canceledAt: null,
    };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: '00', desc: 'success', data: link, signature: 'bad-signature' }),
        ),
    );
    await expect(new PayOSPaymentProvider(env).getPaymentStatus(12345)).rejects.toThrow('xác minh');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ code: '00', desc: 'success', data: link, signature: signature(link) }),
        ),
    );
    expect((await new PayOSPaymentProvider(env).getPaymentStatus(12345)).status).toBe('SUCCEEDED');
  });
  it('uses server amount and original deadline when creating a link', async () => {
    const link = {
      bin: '970422',
      accountNumber: '123',
      accountName: 'Fixture',
      amount: 1200000,
      description: 'fixture',
      orderCode: 12345,
      currency: 'VND',
      paymentLinkId: 'unit-link',
      status: 'PENDING',
      checkoutUrl: 'https://pay.payos.vn/web/unit-link',
      qrCode: 'fixture',
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ code: '00', desc: 'success', data: link, signature: signature(link) }),
      );
    vi.stubGlobal('fetch', fetch);
    const expiresAt = new Date('2026-11-01T00:05:00Z');
    const result = await new PayOSPaymentProvider(env).createPayment({
      paymentId: randomUUID(),
      orderId: randomUUID(),
      orderCode: 12345,
      amountVnd: 1200000,
      expiresAt,
      items: [{ name: 'VIP', quantity: 1, price: 1200000 }],
    });
    expect(result.amountVnd).toBe(1200000);
    const sent = JSON.parse(fetch.mock.calls[0]![1].body) as {
      amount: number;
      expiredAt: number;
      returnUrl: string;
    };
    expect(sent.amount).toBe(1200000);
    expect(sent.expiredAt).toBe(Math.floor(expiresAt.getTime() / 1000));
    expect(sent.returnUrl).toContain('/payment/success?paymentId=');
  });
});
describe('Signed opaque ticket credentials', () => {
  it('regenerates a credential from only random ID and persistent key', () => {
    const id = randomUUID(),
      value = ticketCredential(id, key);
    expect(verifyTicketCredential(value, key)).toBe(id);
    expect(ticketCredential(id, key)).toBe(value);
    expect(credentialHash(value)).toMatch(/^[a-f0-9]{64}$/);
    expect(value).not.toContain('@');
  });
  it('rejects another ticket ID or signing key', () => {
    const value = ticketCredential(randomUUID(), key);
    expect(verifyTicketCredential(value, 'another-key')).toBeNull();
    expect(
      verifyTicketCredential(value.replace(value.split('.')[1]!, randomUUID()), key),
    ).toBeNull();
  });
  it.each([
    '',
    'TF-DEMO-1',
    'tf1.bad.bad',
    'tf2.invalid',
    'tf1.00000000-0000-4000-8000-000000000001.short',
  ])('rejects malformed credential %j', (value) => {
    expect(verifyTicketCredential(value, key)).toBeNull();
  });
});
