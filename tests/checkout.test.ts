import { afterEach, expect, mock, test } from 'bun:test';
import { onRequestPost } from '../functions/api/checkout';

type Context = Parameters<typeof onRequestPost>[0];
const origin = 'https://example.test';
const checkoutUrl = 'https://checkout.stripe.com/c/pay/test';
const originalFetch = globalThis.fetch;
const originalError = console.error;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalError;
});

function order(body: unknown, env: Context['env'] = {
  STRIPE_SECRET_KEY: 'not-a-real-key',
  STRIPE_PRICE_WHITE: 'price_white_test',
  STRIPE_PRICE_BUNDLE: 'price_bundle_test',
}) {
  const request = new Request(`${origin}/api/checkout`, { method: 'POST', body: JSON.stringify(body) });
  return onRequestPost({ request, env });
}

test('sends Stripe Price IDs, manual capture, both shipping rates and the return URLs', async () => {
  const stripe = mock(async (_url: string, init: RequestInit) => {
    const fields = init.body as URLSearchParams;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(Object.fromEntries(fields)).toEqual({
      mode: 'payment',
      currency: 'eur',
      'payment_intent_data[capture_method]': 'manual',
      'shipping_address_collection[allowed_countries][0]': 'ES',
      'phone_number_collection[enabled]': 'true',
      locale: 'auto',
      success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#shop`,
      'line_items[0][price]': 'price_white_test',
      'line_items[0][quantity]': '20',
      'line_items[1][price]': 'price_bundle_test',
      'line_items[1][quantity]': '1',
      'shipping_options[0][shipping_rate_data][display_name]': 'Hand delivery at the academy',
      'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
      'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '0',
      'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'eur',
      'shipping_options[1][shipping_rate_data][display_name]': 'Shipping, Spain peninsular',
      'shipping_options[1][shipping_rate_data][type]': 'fixed_amount',
      'shipping_options[1][shipping_rate_data][fixed_amount][amount]': '500',
      'shipping_options[1][shipping_rate_data][fixed_amount][currency]': 'eur',
    });
    return Response.json({ url: checkoutUrl });
  });
  globalThis.fetch = stripe as unknown as typeof fetch;

  const response = await order({ items: [{ id: 'white', qty: 20 }, { id: 'bundle', qty: 1 }] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: checkoutUrl });
  expect(stripe.mock.calls[0]?.[0]).toBe('https://api.stripe.com/v1/checkout/sessions');
});

test.each([
  ['empty', []],
  ['all-zero', [{ id: 'white', qty: 0 }, { id: 'bundle', qty: 0 }]],
  ['unknown product', [{ id: 'green', qty: 1 }]],
  ['too many', [{ id: 'white', qty: 21 }]],
  ['non-integer', [{ id: 'white', qty: 1.5 }]],
  ['duplicate', [{ id: 'white', qty: 10 }, { id: 'white', qty: 15 }]],
] as const)('rejects %s cart without reaching Stripe', async (_label, items) => {
  const stripe = mock(() => { throw new Error('Unexpected Stripe call'); });
  globalThis.fetch = stripe as unknown as typeof fetch;

  expect((await order({ items })).status).toBe(400);
  expect(stripe).not.toHaveBeenCalled();
});

test('reports missing configuration without contacting Stripe', async () => {
  const stripe = mock(() => { throw new Error('Unexpected Stripe call'); });
  globalThis.fetch = stripe as unknown as typeof fetch;

  expect((await order({ items: [{ id: 'white', qty: 1 }] }, {})).status).toBe(503);
  expect(stripe).not.toHaveBeenCalled();
});

test('sanitizes Stripe authentication errors', async () => {
  globalThis.fetch = mock(async () => Response.json({ error: { message: 'Sensitive upstream details' } }, { status: 401 })) as unknown as typeof fetch;
  const log = mock(() => {});
  console.error = log;

  const response = await order({ items: [{ id: 'white', qty: 1 }] });
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'Checkout is temporarily unavailable. Please try again.' });
  expect(log).toHaveBeenCalledWith('[checkout] Stripe authentication failed (HTTP 401).');
});
