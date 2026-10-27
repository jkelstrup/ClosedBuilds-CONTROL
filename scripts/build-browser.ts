import { resolve } from 'node:path';
import { buildBrowserAssets } from './browser-build.js';

void buildBrowserAssets(resolve(__dirname, '../../..')).catch(
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
