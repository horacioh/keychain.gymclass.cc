import { copy } from './copy';
import { isBundle, type Language, type Product } from './products';

export function productSlides(product: Product, language: Language) {
  if (isBundle(product.id)) return [];

  const t = copy[language].gallery;
  const name = product.name[language];
  const max = product.id === 'black' || product.id === 'black-teacher' ? 6 : 4;
  return [
    { src: product.image, alt: name, width: 1600, height: 1600 },
    { src: `/${product.id}-angle-v3.webp`, alt: `${name} — ${t.angle}`, width: 1600, height: 1600 },
    { src: `/${product.id}-stripes-v3.webp`, alt: `${name} — ${t.stripes} 0–${max}`, width: 2400, height: 1350 },
    { src: `/${product.id}-exploded-v3.webp`, alt: `${name} — ${t.parts}`, width: 1600, height: 1600 },
  ];
}
