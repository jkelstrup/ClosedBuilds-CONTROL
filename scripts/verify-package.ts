import { resolve } from 'node:path';
import { verifyPackageResources } from './package-resources.js';

const archive = process.argv[2];
if (!archive || process.argv.length !== 3)
  throw new Error('Usage: npm run verify:package -- <path/to/app.asar>');
void verifyPackageResources(resolve(__dirname, '../../..'), resolve(archive))
  .then(() => {
    console.log(
      'Unsigned package resources verified (no application startup or device access).',
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
