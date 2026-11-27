const SINGLE_PRICE = 900;
export const MAX_QUANTITY = 20;

export const products = [
  { id: 'white', name: { en: 'White belt', es: 'Cinturón blanco' }, image: '/belt-white.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbT8Dt1Pyatlq', stripeProductEnv: 'STRIPE_PRODUCT_WHITE' },
  { id: 'blue', name: { en: 'Blue belt', es: 'Cinturón azul' }, image: '/belt-blue.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbUNfEYmEl7EI', stripeProductEnv: 'STRIPE_PRODUCT_BLUE' },
  { id: 'purple', name: { en: 'Purple belt', es: 'Cinturón morado' }, image: '/belt-purple.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbWdjE5Vhpwj1', stripeProductEnv: 'STRIPE_PRODUCT_PURPLE' },
  { id: 'brown', name: { en: 'Brown belt', es: 'Cinturón marrón' }, image: '/belt-brown.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbWPoKDnUeBYB', stripeProductEnv: 'STRIPE_PRODUCT_BROWN' },
  { id: 'black', name: { en: 'Black belt', es: 'Cinturón negro' }, image: '/belt-black.webp', unitPrice: SINGLE_PRICE, stripeProductId: 'prod_VhbX9RG0lYJ8iE', stripeProductEnv: 'STRIPE_PRODUCT_BLACK' },
  { id: 'black-teacher', name: { en: 'Instructor black belt', es: 'Cinturón negro de instructor' }, image: '/belt-black-teacher.webp', unitPrice: 1_100, stripeProductId: 'prod_VhyQK5ho6ZwNv9', stripeProductEnv: 'STRIPE_PRODUCT_BLACK_TEACHER' },
  { id: 'bundle', name: { en: 'Full set: all 5 belts', es: 'Colección completa: los 5 cinturones' }, image: '/belt-bundle.webp', unitPrice: 3_900, stripeProductId: 'prod_VhbXBXCE5U2WUM', stripeProductEnv: 'STRIPE_PRODUCT_BUNDLE' },
  { id: 'bundle-teacher', name: { en: 'Full set + instructor belt', es: 'Colección completa + cinturón de instructor' }, image: '/belt-bundle-teacher.webp', unitPrice: 4_900, stripeProductId: 'prod_VhyQMd5IrwhtHH', stripeProductEnv: 'STRIPE_PRODUCT_BUNDLE_TEACHER' },
] as const;

export type Product = (typeof products)[number];
export type ProductId = Product['id'];
export type Language = keyof Product['name'];

const standardBelts = ['white', 'blue', 'purple', 'brown', 'black'] as const;
const bundleContents: Partial<Record<ProductId, readonly ProductId[]>> = {
  bundle: standardBelts,
  'bundle-teacher': [...standardBelts, 'black-teacher'],
};
const fallbackPrices = new Map<ProductId, number>(products.map(({ id, unitPrice }) => [id, unitPrice]));

export function getFallbackPrice(id: ProductId) {
  return fallbackPrices.get(id)!;
}

export function isBundle(id: ProductId) {
  return id in bundleContents;
}

export function getCompareAtPrice(id: ProductId, getPrice = getFallbackPrice) {
  const separate = bundleContents[id]?.reduce((sum, item) => sum + getPrice(item), 0);
  return separate !== undefined && separate > getPrice(id) ? separate : null;
}

export function formatPrice(cents: number, language: Language) {
  return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
