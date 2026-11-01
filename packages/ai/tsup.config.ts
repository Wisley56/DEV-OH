import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', 'balance/index': 'src/balance/index.ts' },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2023',
});
