import { mkdir, readdir, stat } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { execFileSync } from 'node:child_process';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Usage: node scripts/optimize-editorial-images.mjs <source-directory>');
const destination = resolve('public/images/editorial');
await mkdir(destination, { recursive: true });
let originalBytes = 0;
let outputBytes = 0;
for (const file of await readdir(sourceDir)) {
  if (!file.endsWith('.png')) continue;
  const source = resolve(sourceDir, file);
  originalBytes += (await stat(source)).size;
  for (const width of [600, 1440]) {
    const output = resolve(destination, basename(file, '.png') + '-' + width + '.webp');
    execFileSync(process.env.CWEBP_BIN || 'cwebp', [
      '-quiet', '-mt', '-q', '80', '-m', '6', '-resize', String(width), '0',
      source, '-o', output
    ]);
    outputBytes += (await stat(output)).size;
  }
}
console.log(JSON.stringify({ originalBytes, outputBytes, reduction: (1 - outputBytes / originalBytes) * 100 }));
