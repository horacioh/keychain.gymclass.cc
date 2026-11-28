const SINGLE_PRICE = 1_200;
const BUNDLE_PRICE = 5_000;
export const MAX_QUANTITY = 20;

export const products = [
  { id: 'white', name: { en: 'White belt', es: 'Cinturón blanco' }, image: '/belt-white.webp', unitPrice: SINGLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_WHITE' },
  { id: 'blue', name: { en: 'Blue belt', es: 'Cinturón azul' }, image: '/belt-blue.webp', unitPrice: SINGLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_BLUE' },
  { id: 'purple', name: { en: 'Purple belt', es: 'Cinturón morado' }, image: '/belt-purple.webp', unitPrice: SINGLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_PURPLE' },
  { id: 'brown', name: { en: 'Brown belt', es: 'Cinturón marrón' }, image: '/belt-brown.webp', unitPrice: SINGLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_BROWN' },
  { id: 'black', name: { en: 'Black belt', es: 'Cinturón negro' }, image: '/belt-black.webp', unitPrice: SINGLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_BLACK' },
  { id: 'bundle', name: { en: 'Full set: all 5 belts', es: 'Colección completa: los 5 cinturones' }, image: '/belt-bundle.webp', unitPrice: BUNDLE_PRICE, stripePriceEnv: 'STRIPE_PRICE_BUNDLE' },
] as const;

export type Product = (typeof products)[number];
export type Language = keyof Product['name'];

export function formatPrice(cents: number, language: Language) {
  return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
