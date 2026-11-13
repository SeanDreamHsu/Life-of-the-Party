// Bundles one entry file into a single script. ENTRY and OUT come from the caller.
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url));
export default {
  root,
  build: {
    lib: { entry: process.env.ENTRY, formats: ['iife'], name: 'Lotp', fileName: () => 'bundle.js' },
    outDir: process.env.OUT, minify: process.env.MINIFY !== '0', emptyOutDir: true, target: 'es2020',
  },
  logLevel: 'warn',
};
