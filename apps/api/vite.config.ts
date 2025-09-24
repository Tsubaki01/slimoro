import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirnameLocal = dirname(__filename);

export default defineConfig(() => ({
  root: __dirnameLocal,
  cacheDir: '../../node_modules/.vite/apps/api',
  plugins: [
    tsconfigPaths({
      root: __dirnameLocal,
    }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
}));
