import type { PagesFunction } from '@cloudflare/workers-types';
import { MAX_QUANTITY, products, type Product } from '../../src/config/products';

type Env = Partial<Record<'STRIPE_SECRET_KEY' | Product['stripePriceEnv'], string>>;
type WorkerContext = Parameters<PagesFunction<Env>>[0];
type CheckoutContext = { request: Pick<WorkerContext['request'], 'url' | 'json'>; env: Env };
type Item = { product: Product; qty: number };

function parseItems(body: unknown): Item[] | null {
  if (!body || typeof body !== 'object' || !('items' in body)) return null;
  const { items } = body;
  if (!Array.isArray(items) || items.length === 0 || items.length > products.length) return null;

  const seen = new Set<Product['id']>();
  const selection: Item[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const { id, qty } = item;
    const product = products.find(candidate => candidate.id === id);
    if (!product || seen.has(product.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) return null;
    seen.add(product.id);
    selection.push({ product, qty });
  }
  return selection;
}

const stripeUnavailable = () => Response.json({ error: 'Checkout is temporarily unavailable. Please try again.' }, { status: 502 });

export async function onRequestPost({ request, env }: CheckoutContext) {
  let selection: Item[] | null;
  try {
    selection = parseItems(await request.json());
  } catch {
    selection = null;
  }
  if (!selection) return Response.json({ error: 'Select at least one valid product with a quantity from 1 to 20.' }, { status: 400 });

  const secret = env.STRIPE_SECRET_KEY;
  if (!secret || selection.some(({ product }) => !env[product.stripePriceEnv])) {
    return Response.json({ error: 'Checkout is not configured.' }, { status: 503 });
  }

  const { origin } = new URL(request.url);
  const params = new URLSearchParams({
    mode: 'payment',
    currency: 'eur',
    'payment_intent_data[capture_method]': 'manual',
    'shipping_address_collection[allowed_countries][0]': 'ES',
    'phone_number_collection[enabled]': 'true',
    locale: 'auto',
    success_url: `${origin}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/#shop`,
  });
  selection.forEach(({ product, qty }, index) => {
    params.set(`line_items[${index}][price]`, env[product.stripePriceEnv]!);
    params.set(`line_items[${index}][quantity]`, String(qty));
  });
  ['Hand delivery at the academy', 'Shipping, Spain peninsular'].forEach((name, index) => {
    const prefix = `shipping_options[${index}][shipping_rate_data]`;
    params.set(`${prefix}[display_name]`, name);
    params.set(`${prefix}[type]`, 'fixed_amount');
    params.set(`${prefix}[fixed_amount][amount]`, index === 0 ? '0' : '500');
    params.set(`${prefix}[fixed_amount][currency]`, 'eur');
  });

  try {
    const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });
    if (!stripe.ok) {
      if (stripe.status === 401) console.error('[checkout] Stripe authentication failed (HTTP 401).');
      else console.error(`[checkout] Stripe returned HTTP ${stripe.status}.`);
      return stripeUnavailable();
    }
    const result: unknown = await stripe.json();
    if (result && typeof result === 'object' && 'url' in result && typeof result.url === 'string' && result.url.startsWith('https://')) {
      return Response.json({ url: result.url });
    }
    console.error('[checkout] Stripe did not return a valid session URL.');
  } catch {
    console.error('[checkout] Could not read a response from Stripe.');
  }
  return stripeUnavailable();
}
