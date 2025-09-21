import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = dirname(__filename);

export default defineConfig({
  plugins: [
    tsconfigPaths({
      root: __dirnameLocal,
    }),
  ],
  test: {
    environment: 'node',
  },
});
