import { products } from '../../src/config/products';
import { getDefaultPrice, type StripeEnv } from '../../src/config/stripe';

type PriceContext = {
  request: { url: string };
  env: StripeEnv;
  waitUntil: (promise: Promise<unknown>) => void;
};

export async function onRequestGet({ request, env, waitUntil }: PriceContext) {
  const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)?.default;
  const cacheKey = new URL('/api/prices', request.url).href;
  const cached = await cache?.match(cacheKey).catch(() => undefined);
  if (cached) return cached;

  const secret = env.STRIPE_SECRET_KEY;
  const entries = secret ? await Promise.all(products.map(async product => {
    const price = await getDefaultPrice(product, secret, env);
    return price ? [[product.id, price.amount] as const] : [];
  })) : [];
  const prices = entries.flat();
  const complete = prices.length === products.length;
  const response = Response.json(Object.fromEntries(prices), {
    status: prices.length ? 200 : 503,
    headers: { 'Cache-Control': complete ? 'public, max-age=300' : 'no-store' },
  });
  if (cache && complete) waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  return response;
}
