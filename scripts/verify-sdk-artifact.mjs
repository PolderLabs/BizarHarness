import { existsSync } from 'node:fs';
const root = new URL('../packages/sdk/', import.meta.url);
const required = ['dist/index.js', 'dist/index.d.ts'];
const missing = required.filter((file) => !existsSync(new URL(file, root)));
if (missing.length) {
  console.error(`SDK artifact missing: ${missing.join(', ')}. Run npm run build:sdk first.`);
  process.exit(1);
}
console.log('SDK artifact verified; reusing the existing build.');
