import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

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
