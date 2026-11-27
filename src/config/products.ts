const SINGLE_PRICE = 900;
const BUNDLE_PRICE = 5_000;
export const MAX_QUANTITY = 20;

export const products = [
  { id: 'white', name: { en: 'White belt', es: 'Cinturón blanco' }, image: '/belt-white.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbT8Dt1Pyatlq', stripeProductEnv: 'STRIPE_PRODUCT_WHITE' },
  { id: 'blue', name: { en: 'Blue belt', es: 'Cinturón azul' }, image: '/belt-blue.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbUNfEYmEl7EI', stripeProductEnv: 'STRIPE_PRODUCT_BLUE' },
  { id: 'purple', name: { en: 'Purple belt', es: 'Cinturón morado' }, image: '/belt-purple.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbWdjE5Vhpwj1', stripeProductEnv: 'STRIPE_PRODUCT_PURPLE' },
  { id: 'brown', name: { en: 'Brown belt', es: 'Cinturón marrón' }, image: '/belt-brown.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbWPoKDnUeBYB', stripeProductEnv: 'STRIPE_PRODUCT_BROWN' },
  { id: 'black', name: { en: 'Black belt', es: 'Cinturón negro' }, image: '/belt-black.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbX9RG0lYJ8iE', stripeProductEnv: 'STRIPE_PRODUCT_BLACK' },
  { id: 'bundle', name: { en: 'Full set: all 5 belts', es: 'Colección completa: los 5 cinturones' }, image: '/belt-bundle.webp', unitPrice: BUNDLE_PRICE, stripeProductId: 'prod_VhbXBXCE5U2WUM', stripeProductEnv: 'STRIPE_PRODUCT_BUNDLE' },
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
