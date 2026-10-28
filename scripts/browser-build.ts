import { build, context, type BuildOptions } from 'esbuild';
import { join } from 'node:path';

function options(root: string): BuildOptions {
  return {
    absWorkingDir: root,
    entryPoints: {
      renderer: 'src/renderer/legacy-entry.ts',
      'preview-worker': 'app/lib/3dview/workers/verylitegcodeviewer.js',
    },
    outdir: join(root, 'app/generated'),
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome110',
    // Do not inherit alwaysStrict from the tooling tsconfig: the retained
    // classic worker uses implicit globals. Migrated TS is checked separately.
    tsconfigRaw: { compilerOptions: { alwaysStrict: false } },
    sourcemap: true,
    logLevel: 'info',
  };
}

export async function buildBrowserAssets(root: string): Promise<void> {
  await build(options(root));
}

export async function watchBrowserAssets(
  root: string,
): Promise<{ dispose: () => Promise<void> }> {
  const watcher = await context(options(root));
  try {
    await watcher.watch();
    await watcher.rebuild();
    return watcher;
  } catch (error) {
    await watcher.dispose();
    throw error;
  }
}
