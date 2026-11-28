import { expect, test } from 'bun:test';
import { productSlides } from '../src/config/gallery';
import { products } from '../src/config/products';

test('each single product has four ordered slides with existing assets and localized alt text', async () => {
  for (const product of products.slice(0, 6)) {
    const en = productSlides(product, 'en');
    const es = productSlides(product, 'es');
    expect(en.map(({ src }) => src)).toEqual([
      product.image, `/${product.id}-angle-v3.webp`, `/${product.id}-stripes-v3.webp`, `/${product.id}-exploded-v3.webp`,
    ]);
    expect(es.map(({ src }) => src)).toEqual(en.map(({ src }) => src));
    const max = product.id.startsWith('black') ? 6 : 4;
    expect(en[2].alt).toContain(`stripe configurations from 0–${max}`);
    expect(es[2].alt).toContain(`configuraciones de rayas de 0–${max}`);
    for (const [index, slide] of en.entries()) {
      expect(slide.alt).toStartWith(product.name.en);
      expect(es[index].alt).toStartWith(product.name.es);
      expect(await Bun.file(`${import.meta.dir}/../public${slide.src}`).exists()).toBe(true);
    }
  }
});

test('bundles have no slideshow in either language', () => {
  for (const bundle of products.slice(6)) {
    expect(productSlides(bundle, 'en')).toEqual([]);
    expect(productSlides(bundle, 'es')).toEqual([]);
  }
});
