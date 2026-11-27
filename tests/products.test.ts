import { expect, test } from 'bun:test';
import { getCompareAtPrice, getFallbackPrice, type ProductId } from '../src/config/products';

test('compares the two bundle fallback prices to the correct sets of individual belts', () => {
  expect(getFallbackPrice('bundle')).toBe(3900);
  expect(getFallbackPrice('bundle-teacher')).toBe(4900);
  expect(getCompareAtPrice('bundle')).toBe(4500);
  expect(getCompareAtPrice('bundle-teacher')).toBe(5600);
  expect(getCompareAtPrice('black-teacher')).toBeNull();
});

test('uses current component prices and hides compare-at prices that are not savings', () => {
  const overrides: Partial<Record<ProductId, number>> = { blue: 1000, 'black-teacher': 1400, bundle: 4600, 'bundle-teacher': 6100 };
  const price = (id: ProductId) => overrides[id] ?? getFallbackPrice(id);
  expect(getCompareAtPrice('bundle', price)).toBeNull();
  expect(getCompareAtPrice('bundle-teacher', price)).toBeNull();
  overrides['bundle-teacher'] = 5900;
  expect(getCompareAtPrice('bundle-teacher', price)).toBe(6000);
});
