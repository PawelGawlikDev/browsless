import { chmod, copyFile, mkdir } from 'node:fs/promises';

const result = await Bun.build({
  entrypoints: ['./packages/mcp/src/index.ts'],
  outdir: './packages/mcp/dist',
  target: 'node',
  format: 'esm',
  packages: 'external',
  banner: '#!/usr/bin/env node',
});
if (!result.success) {
  for (const message of result.logs) console.error(message);
  process.exitCode = 1;
} else {
  await mkdir('./packages/mcp/dist', { recursive: true });
  await chmod('./packages/mcp/dist/index.js', 0o755);
  await copyFile('./LICENSE', './packages/mcp/LICENSE');
  console.log('Built packages/mcp/dist/index.js');
}
