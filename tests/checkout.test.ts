import { afterEach, expect, mock, test } from 'bun:test';
import { onRequestPost } from '../functions/api/checkout';

type Context = Parameters<typeof onRequestPost>[0];
const origin = 'https://example.test';
const checkoutUrl = 'https://checkout.stripe.com/c/pay/test';
const originalFetch = globalThis.fetch;
const originalError = console.error;
const sessions = 'https://api.stripe.com/v1/checkout/sessions';

function stripeProduct(id: string, unit_amount: number, overrides: Record<string, unknown> = {}) {
  return Response.json({ active: true, default_price: { id, unit_amount, active: true, currency: 'eur', type: 'one_time', ...overrides } });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.error = originalError;
});

function order(body: unknown, env: Context['env'] = {
  STRIPE_SECRET_KEY: 'not-a-real-key',
  STRIPE_PRODUCT_WHITE: 'prod_white_test',
  STRIPE_PRODUCT_BUNDLE: 'prod_bundle_test',
}, waitUntil?: Context['waitUntil']) {
  const request = new Request(`${origin}/api/checkout`, { method: 'POST', body: JSON.stringify(body) });
  return onRequestPost({ request, env, waitUntil });
}

test('sends Stripe Price IDs, manual capture, both shipping rates and the return URLs', async () => {
  const stripe = mock(async (url: string | URL, init: RequestInit) => {
    if (url instanceof URL) {
      expect(url.searchParams.get('expand[]')).toBe('default_price');
      if (url.pathname === '/v1/products/prod_white_test') return stripeProduct('price_white_test', 900);
      expect(url.pathname).toBe('/v1/products/prod_bundle_test');
      return stripeProduct('price_bundle_test', 5000);
    }
    const fields = init.body as URLSearchParams;
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/x-www-form-urlencoded' });
    expect(Object.fromEntries(fields)).toEqual({
      mode: 'payment',
      currency: 'eur',
      'managed_payments[enabled]': 'false',
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

  const response = await order({ items: [{ id: 'white', qty: 20, unitAmount: 900 }, { id: 'bundle', qty: 1, unitAmount: 5000 }] });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: checkoutUrl });
  expect(stripe.mock.calls.at(-1)?.[0]).toBe(sessions);
});

test.each([
  ['default API URL', undefined, 'https://openpanelapi.hhg.app/track'],
  ['custom API URL', 'https://analytics.example.test/ingest/', 'https://analytics.example.test/ingest/track'],
] as const)('queues checkout analytics with the %s without waiting for OpenPanel or including customer and Stripe session data', async (_, apiUrl, analyticsUrl) => {
  let rejectAnalytics!: (reason: Error) => void;
  const analyticsResponse = new Promise<Response>((_, reject) => { rejectAnalytics = reject; });
  const fetchMock = mock(async (url: string | URL, _init: RequestInit) => {
    if (url instanceof URL) return stripeProduct('price_white_test', 900);
    if (url === sessions) return Response.json({ url: checkoutUrl, id: 'cs_test_example' });
    return analyticsResponse;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const waitUntil = mock((_promise: Promise<unknown>) => {});
  const response = await order({ language: 'es', email: 'not-forwarded@example.test', items: [{ id: 'white', qty: 2, unitAmount: 900 }] }, {
    STRIPE_SECRET_KEY: 'not-a-real-key',
    OPENPANEL_API_URL: apiUrl,
    OPENPANEL_CLIENT_ID: 'backend-client',
    OPENPANEL_CLIENT_SECRET: 'backend-secret',
  }, waitUntil);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ url: checkoutUrl });
  expect(fetchMock.mock.calls.map(([url]) => String(url)).slice(1)).toEqual([sessions, analyticsUrl]);
  expect(waitUntil).toHaveBeenCalledTimes(1);
  const [, init] = fetchMock.mock.calls[2]!;
  expect(init.redirect).toBe('error');
  expect(init.headers).toEqual({
    'Content-Type': 'application/json',
    'openpanel-client-id': 'backend-client',
    'openpanel-client-secret': 'backend-secret',
  });
  expect(JSON.parse(String(init.body))).toEqual({
    type: 'track',
    payload: {
      name: 'checkout_session_created',
      properties: {
        products: [{ id: 'white', quantity: 2 }],
        subtotal_cents: 1800,
        currency: 'EUR',
        locale: 'es',
      },
    },
  });
  rejectAnalytics(new Error('OpenPanel unavailable'));
  expect(await waitUntil.mock.calls[0]![0]).toBeUndefined();
});

test.each([
  ['incomplete analytics credentials', false],
  ['an unsuccessful Stripe checkout', true],
] as const)('does not queue analytics with %s', async (_, stripeFails) => {
  const fetchMock = mock(async (url: string | URL) => {
    if (url instanceof URL) return stripeProduct('price_white_test', 900);
    expect(url).toBe(sessions);
    return stripeFails ? Response.json({ url: null }) : Response.json({ url: checkoutUrl });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  console.error = mock(() => {});
  const waitUntil = mock((_promise: Promise<unknown>) => {});
  const response = await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }] }, {
    STRIPE_SECRET_KEY: 'not-a-real-key',
    OPENPANEL_CLIENT_ID: 'backend-client',
    OPENPANEL_CLIENT_SECRET: stripeFails ? 'backend-secret' : undefined,
  }, waitUntil);

  expect(response.status).toBe(stripeFails ? 502 : 200);
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(waitUntil).not.toHaveBeenCalled();
});

test.each([
  ['true', 'required', 'es', '/es/'],
  ['false', null, 'https://elsewhere.example', '/'],
])('controls Stripe terms consent with STRIPE_REQUIRE_TERMS=%s and returns to the storefront locale', async (setting, consent, language, home) => {
  const stripe = mock(async (url: string | URL, init: RequestInit) => {
    if (url instanceof URL) return stripeProduct('price_white_test', 900);
    const fields = init.body as URLSearchParams;
    expect(fields.get('consent_collection[terms_of_service]')).toBe(consent);
    expect(fields.get('success_url')).toBe(`${origin}${home}thanks?session_id={CHECKOUT_SESSION_ID}`);
    expect(fields.get('cancel_url')).toBe(`${origin}${home}#shop`);
    return Response.json({ url: checkoutUrl });
  });
  globalThis.fetch = stripe as unknown as typeof fetch;

  const response = await order({ language, items: [{ id: 'white', qty: 1, unitAmount: 900 }] }, {
    STRIPE_SECRET_KEY: 'not-a-real-key',
    STRIPE_PRODUCT_WHITE: 'prod_white_test',
    STRIPE_REQUIRE_TERMS: setting,
  });
  expect(response.status).toBe(200);
  expect(stripe.mock.calls.at(-1)?.[0]).toBe(sessions);
});

test.each([
  ['empty', []],
  ['all-zero', [{ id: 'white', qty: 0, unitAmount: 900 }, { id: 'bundle', qty: 0, unitAmount: 5000 }]],
  ['unknown product', [{ id: 'green', qty: 1, unitAmount: 900 }]],
  ['too many', [{ id: 'white', qty: 21, unitAmount: 900 }]],
  ['non-integer', [{ id: 'white', qty: 1.5, unitAmount: 900 }]],
  ['duplicate', [{ id: 'white', qty: 10, unitAmount: 900 }, { id: 'white', qty: 15, unitAmount: 900 }]],
  ['missing amount', [{ id: 'white', qty: 1 }]],
  ['invalid amount', [{ id: 'white', qty: 1, unitAmount: -1 }]],
] as const)('rejects %s cart without reaching Stripe', async (_label, items) => {
  const stripe = mock(() => { throw new Error('Unexpected Stripe call'); });
  globalThis.fetch = stripe as unknown as typeof fetch;

  expect((await order({ items })).status).toBe(400);
  expect(stripe).not.toHaveBeenCalled();
});

test('reports missing configuration without contacting Stripe', async () => {
  const stripe = mock(() => { throw new Error('Unexpected Stripe call'); });
  globalThis.fetch = stripe as unknown as typeof fetch;

  expect((await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }] }, {})).status).toBe(503);
  expect(stripe).not.toHaveBeenCalled();
});

test('sanitizes Stripe authentication errors', async () => {
  globalThis.fetch = mock(async (url: string | URL) => url === sessions
    ? Response.json({ error: { message: 'Sensitive upstream details' } }, { status: 401 })
    : stripeProduct('price_white_test', 900)) as unknown as typeof fetch;
  const log = mock(() => {});
  console.error = log;

  const response = await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }] });
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'Checkout is temporarily unavailable. Please try again.' });
  expect(log).toHaveBeenCalledWith('[checkout] Stripe authentication failed (HTTP 401).');
  expect(log).toHaveBeenCalledTimes(1);
});

test.each([
  ['descriptive', () => Response.json({ error: { message: 'Invalid shipping option.' } }, { status: 400 }),
    ['[checkout] Stripe returned HTTP 400.', 'Invalid shipping option.']],
  ['sensitive', () => Response.json({ error: { message: 'Cannot use not-a-real-key or sk_test_***123.' } }, { status: 400 }),
    ['[checkout] Stripe returned HTTP 400.', 'Cannot use [REDACTED] or [REDACTED].']],
  ['empty', () => Response.json({ error: { message: '' } }, { status: 400 }),
    ['[checkout] Stripe returned HTTP 400.']],
  ['non-JSON', () => new Response('Bad Gateway', { status: 502 }),
    ['[checkout] Stripe returned HTTP 502.']],
] as const)('logs a safe diagnosis for %s Stripe errors', async (_label, reply, expectedLog) => {
  globalThis.fetch = mock(async (url: string | URL) => url === sessions
    ? reply()
    : stripeProduct('price_white_test', 900)) as unknown as typeof fetch;
  const log = mock(() => {});
  console.error = log;

  const response = await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }] });
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'Checkout is temporarily unavailable. Please try again.' });
  expect(log).toHaveBeenCalledWith(...expectedLog);
  expect(log).toHaveBeenCalledTimes(1);
});

test('returns authoritative amounts for review without creating a session when a price changes', async () => {
  const stripe = mock(async (url: URL) => url.pathname.endsWith('prod_white_test')
    ? stripeProduct('price_white_new', 1200)
    : stripeProduct('price_bundle_test', 5000));
  globalThis.fetch = stripe as unknown as typeof fetch;

  const response = await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }, { id: 'bundle', qty: 1, unitAmount: 5000 }] });
  expect(response.status).toBe(409);
  expect((await response.json()).prices).toEqual({ white: 1200, bundle: 5000 });
  expect(stripe).toHaveBeenCalledTimes(2);
});

test('rejects an instructor product without a configured ID before calling Stripe', async () => {
  const stripe = mock(() => { throw new Error('Unexpected Stripe call'); });
  globalThis.fetch = stripe as unknown as typeof fetch;
  const response = await order({ items: [{ id: 'black-teacher', qty: 1, unitAmount: 1100 }] }, {
    STRIPE_SECRET_KEY: 'not-a-real-key',
    STRIPE_PRODUCT_BLACK_TEACHER: '',
  });
  expect(response.status).toBe(502);
  expect(stripe).not.toHaveBeenCalled();
});

test.each([
  ['missing', () => Response.json({ active: true, default_price: null })],
  ['inactive', () => stripeProduct('price_white_test', 900, { active: false })],
  ['non-EUR', () => stripeProduct('price_white_test', 900, { currency: 'usd' })],
  ['recurring', () => stripeProduct('price_white_test', 900, { type: 'recurring' })],
] as const)('rejects %s default prices without creating a session', async (_kind, reply) => {
  const stripe = mock(async () => reply());
  globalThis.fetch = stripe as unknown as typeof fetch;

  const response = await order({ items: [{ id: 'white', qty: 1, unitAmount: 900 }] });
  expect(response.status).toBe(502);
  expect(stripe).toHaveBeenCalledTimes(1);
});
