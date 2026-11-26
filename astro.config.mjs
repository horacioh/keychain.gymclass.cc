import { defineConfig } from 'astro/config';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://keychain.gymclass.cc',
  output: 'static',
  vite: { plugins: [tailwind()] },
});
