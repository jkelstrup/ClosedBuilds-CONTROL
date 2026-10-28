import { resolve } from 'node:path';
import {
  findUnsignedArchive,
  verifyPackageResources,
} from './package-resources.js';

if (process.argv.length > 3)
  throw new Error('Usage: npm run verify:package -- [path/to/app.asar]');
const root = resolve(__dirname, '../../..');
const archive = process.argv[2]
  ? resolve(process.argv[2])
  : findUnsignedArchive(resolve(root, 'dist/unsigned'));
void verifyPackageResources(root, archive)
  .then(() => {
    console.log(
      'Unsigned package resources verified (no application startup or device access).',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
