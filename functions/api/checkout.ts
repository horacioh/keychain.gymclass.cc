import type { PagesFunction } from '@cloudflare/workers-types';
import { MAX_QUANTITY, products, type Language, type Product } from '../../src/config/products';
import { getDefaultPrice, type StripeEnv } from '../../src/config/stripe';

type WorkerContext = Parameters<PagesFunction<StripeEnv>>[0];
type CheckoutContext = {
  request: Pick<WorkerContext['request'], 'url' | 'json'>;
  env: StripeEnv & { STRIPE_REQUIRE_TERMS?: string; OPENPANEL_CLIENT_ID?: string; OPENPANEL_CLIENT_SECRET?: string };
  waitUntil?: WorkerContext['waitUntil'];
};
type Item = { product: Product; qty: number; unitAmount: number };

function parseOrder(body: unknown) {
  if (!body || typeof body !== 'object' || !('items' in body)) return null;
  const { items } = body;
  if (!Array.isArray(items) || items.length === 0 || items.length > products.length) return null;

  const seen = new Set<Product['id']>();
  const selection: Item[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const { id, qty, unitAmount } = item;
    const product = products.find(candidate => candidate.id === id);
    if (!product || seen.has(product.id) || !Number.isInteger(qty) || qty < 1 || qty > MAX_QUANTITY) return null;
    if (!Number.isSafeInteger(unitAmount) || unitAmount < 0) return null;
    seen.add(product.id);
    selection.push({ product, qty, unitAmount });
  }
  const language: Language = 'language' in body && body.language === 'es' ? 'es' : 'en';
  return { selection, language };
}

const stripeUnavailable = () => Response.json({ error: 'Checkout is temporarily unavailable. Please try again.' }, { status: 502 });

async function trackCheckout(clientId: string, clientSecret: string, items: Item[], locale: Language) {
  try {
    await fetch('https://api.openpanel.dev/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'openpanel-client-id': clientId,
        'openpanel-client-secret': clientSecret,
      },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        type: 'track',
        payload: {
          name: 'checkout_session_created',
          properties: {
            products: items.map(({ product, qty }) => ({ id: product.id, quantity: qty })),
            subtotal_cents: items.reduce((total, { qty, unitAmount }) => total + qty * unitAmount, 0),
            currency: 'EUR',
            locale,
          },
        },
      }),
    });
  } catch {
    // Analytics is best effort.
  }
}

export async function onRequestPost({ request, env, waitUntil }: CheckoutContext) {
  let order: ReturnType<typeof parseOrder>;
  try {
    order = parseOrder(await request.json());
  } catch {
    order = null;
  }
  if (!order) return Response.json({ error: 'Select at least one valid product with a quantity from 1 to 20.' }, { status: 400 });
  const { selection, language } = order;
  const home = language === 'es' ? '/es/' : '/';

  const secret = env.STRIPE_SECRET_KEY;
  if (!secret) {
    return Response.json({ error: 'Checkout is not configured.' }, { status: 503 });
  }

  const priced = await Promise.all(selection.map(async item => {
    const price = await getDefaultPrice(item.product, secret, env);
    return price ? { ...item, price } : null;
  }));
  const resolved = priced.filter(item => item !== null);
  if (resolved.length !== selection.length) return stripeUnavailable();

  if (resolved.some(({ unitAmount, price }) => unitAmount !== price.amount)) {
    return Response.json({
      error: 'Prices changed. Please review your order.',
      prices: Object.fromEntries(resolved.map(({ product, price }) => [product.id, price.amount])),
    }, { status: 409 });
  }

  const { origin } = new URL(request.url);
  const params = new URLSearchParams({
    mode: 'payment',
    currency: 'eur',
    'managed_payments[enabled]': 'false',
    'payment_intent_data[capture_method]': 'manual',
    'shipping_address_collection[allowed_countries][0]': 'ES',
    'phone_number_collection[enabled]': 'true',
    locale: 'auto',
    success_url: `${origin}${home}thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${home}#shop`,
  });
  if (env.STRIPE_REQUIRE_TERMS === 'true') params.set('consent_collection[terms_of_service]', 'required');
  resolved.forEach(({ price, qty }, index) => {
    params.set(`line_items[${index}][price]`, price.id);
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
      else {
        const body = await stripe.json().catch(() => null);
        const message: unknown = body?.error?.message;
        const diagnostic = `[checkout] Stripe returned HTTP ${stripe.status}.`;
        if (typeof message === 'string' && message.trim()) {
          const safeMessage = message.replaceAll(secret, '[REDACTED]').replace(/\b(?:sk|rk)_(?:test|live)_[\w*…-]*/g, '[REDACTED]');
          console.error(diagnostic, safeMessage);
        } else {
          console.error(diagnostic);
        }
      }
      return stripeUnavailable();
    }
    const result: unknown = await stripe.json();
    if (result && typeof result === 'object' && 'url' in result && typeof result.url === 'string' && result.url.startsWith('https://')) {
      if (waitUntil && env.OPENPANEL_CLIENT_ID && env.OPENPANEL_CLIENT_SECRET) {
        waitUntil(trackCheckout(env.OPENPANEL_CLIENT_ID, env.OPENPANEL_CLIENT_SECRET, resolved, language));
      }
      return Response.json({ url: result.url });
    }
    console.error('[checkout] Stripe did not return a valid session URL.');
  } catch {
    console.error('[checkout] Could not read a response from Stripe.');
  }
  return stripeUnavailable();
}
