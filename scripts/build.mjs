import { cp, mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const name of ['index.html', 'styles.css', 'app.js', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  await cp(path.join(root, name), path.join(dist, name));
}
await cp(path.join(root, 'public'), path.join(dist, 'public'), { recursive: true });

const words = await stat(path.join(dist, 'public', 'data', 'words.json'));
console.log(`Built dist/ with ${(words.size / 1024 / 1024).toFixed(2)} MB vocabulary data.`);

