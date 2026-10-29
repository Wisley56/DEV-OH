/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Pacotes @devoh/* expõem o código-fonte na condição "source": HMR direto no engine, sem build.
    conditions: ['source', ...defaultClientConditions],
  },
  test: {
    environment: 'jsdom',
  },
});
