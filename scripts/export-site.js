import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { zipSync } from 'fflate';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'standalone/index.html'));
mkdirSync(resolve(root, 'downloads'), { recursive: true });
writeFileSync(
  resolve(root, 'downloads/Nexo-site.zip'),
  zipSync({ 'index.html': new Uint8Array(html) }, { level: 9 }),
);
console.log('Pacote de publicação criado: downloads/Nexo-site.zip (index.html na raiz).');
