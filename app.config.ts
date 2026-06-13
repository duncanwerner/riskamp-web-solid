
import { defineConfig } from "@solidjs/start/config";
import { join } from 'node:path';

export default defineConfig({
  ssr: false,
  server: {
    preset: "cloudflare-pages-static",
  },
  vite: {
    server: {
      fs: {
        allow: [
          'package.json',
          'search',
          '.',
          join(process.cwd(), '../RAW/dist'),
        ],
      },
    },
    resolve: {
      dedupe: ["solid-js", "solid-js/web", "solid-js/store"],
    },
    worker: {
      format: 'es',
    },
    assetsInclude: ['**/*.wasm'],
  },
});