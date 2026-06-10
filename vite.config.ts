import { defineConfig } from "vite";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import { join } from 'node:path';
import { solidStart } from "@solidjs/start/config";

export default defineConfig({
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
  worker: {
    format: 'es',
  },
  plugins: [
    solidStart({ ssr: false }),
    nitro()
  ],
  assetsInclude: ['**/*.wasm'],
});
