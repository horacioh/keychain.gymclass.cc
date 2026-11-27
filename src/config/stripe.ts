import type { Product } from './products';

export type StripeEnv = Partial<Record<'STRIPE_SECRET_KEY' | Product['stripeProductEnv'], string>>;
type StripeProduct = {
  active?: unknown;
  default_price?: { active?: unknown; currency?: unknown; type?: unknown; id?: unknown; unit_amount?: unknown };
};

export async function getDefaultPrice(product: Product, secret: string, env: StripeEnv) {
  const id = env[product.stripeProductEnv] || product.stripeProductId;
  const url = new URL(`https://api.stripe.com/v1/products/${encodeURIComponent(id)}`);
  url.searchParams.append('expand[]', 'default_price');

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    if (!response.ok) return null;
    const result: StripeProduct | null = await response.json();
    const price = result?.default_price;
    if (result?.active !== true || price?.active !== true || price.currency !== 'eur' || price.type !== 'one_time'
      || typeof price.id !== 'string' || !price.id.startsWith('price_')
      || typeof price.unit_amount !== 'number' || !Number.isSafeInteger(price.unit_amount) || price.unit_amount < 0) return null;
    return { id: price.id, amount: price.unit_amount };
  } catch {
    return null;
  }
}
