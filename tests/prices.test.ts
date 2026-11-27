import { afterEach, expect, mock, test } from 'bun:test';
import { onRequestGet } from '../functions/api/prices';

type Context = Parameters<typeof onRequestGet>[0];
const originalFetch = globalThis.fetch;
const cacheDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'caches');
const request = { url: 'https://example.test/api/prices' };

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (cacheDescriptor) Object.defineProperty(globalThis, 'caches', cacheDescriptor);
  else Reflect.deleteProperty(globalThis, 'caches');
});

function price(amount: number) {
  return Response.json({
    active: true,
    default_price: { id: 'price_test', unit_amount: amount, active: true, currency: 'eur', type: 'one_time' },
  });
}

function catalog(env: Context['env'] = { STRIPE_SECRET_KEY: 'not-a-real-key' }) {
  const waitUntil = mock((_promise: Promise<unknown>) => {});
  return { response: onRequestGet({ request, env, waitUntil }), waitUntil };
}

test('returns a cacheable catalog of current cents by storefront ID', async () => {
  const stripe = mock(async (url: URL) => {
    expect(url.searchParams.get('expand[]')).toBe('default_price');
    const amounts: Record<string, number> = { prod_bundle_test: 3900, prod_VhyQK5ho6ZwNv9: 1100, prod_VhyQMd5IrwhtHH: 4900 };
    return price(amounts[url.pathname.split('/').at(-1)!] ?? 900);
  });
  globalThis.fetch = stripe as unknown as typeof fetch;
  let stored: Response | undefined;
  const match = mock(async () => stored?.clone());
  const put = mock(async (_key: string, response: Response) => { stored = response; });
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: { default: { match, put } } });

  const result = catalog({ STRIPE_SECRET_KEY: 'not-a-real-key', STRIPE_PRODUCT_BUNDLE: 'prod_bundle_test' });
  const response = await result.response;
  const expected = { white: 900, blue: 900, purple: 900, brown: 900, black: 900, 'black-teacher': 1100, bundle: 3900, 'bundle-teacher': 4900 };
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  expect(await response.json()).toEqual(expected);
  expect(put).toHaveBeenCalledWith(request.url, expect.any(Response));
  expect(result.waitUntil).toHaveBeenCalledTimes(1);
  expect(await (await catalog().response).json()).toEqual(expected);
  expect(stripe).toHaveBeenCalledTimes(8);
});

test('returns successful prices without caching a partial upstream failure', async () => {
  globalThis.fetch = mock(async (url: URL) => url.pathname.endsWith('prod_VhbT8Dt1Pyatlq')
    ? price(900) : new Response(null, { status: 502 })) as unknown as typeof fetch;

  const response = await catalog().response;
  expect(response.status).toBe(200);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ white: 900 });
});

test('missing secrets and failed Stripe requests leave the storefront on fallback prices', async () => {
  const stripe = mock(async () => { throw new Error('network error'); });
  globalThis.fetch = stripe as unknown as typeof fetch;

  const unconfigured = await catalog({}).response;
  expect(unconfigured.status).toBe(503);
  expect(stripe).not.toHaveBeenCalled();
  const unavailable = await catalog().response;
  expect(unavailable.status).toBe(503);
  expect(unavailable.headers.get('Cache-Control')).toBe('no-store');
  expect(await unavailable.json()).toEqual({});
});

test('skips lookup for a product without a configured ID', async () => {
  const stripe = mock(async () => price(900));
  globalThis.fetch = stripe as unknown as typeof fetch;

  const response = await catalog({ STRIPE_SECRET_KEY: 'not-a-real-key', STRIPE_PRODUCT_BLACK_TEACHER: '' }).response;
  expect(response.status).toBe(200);
  expect(await response.json()).not.toHaveProperty('black-teacher');
  expect(stripe).toHaveBeenCalledTimes(7);
});
