// Значки расширения из icons/src/layers.svg (Lucide, ISC): тёмный квадрат Catppuccin Mocha, слои цвета акцента.
// Рисует Chromium (Playwright) — сглаживание как в браузере. Запуск: just icons
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(import.meta.dirname, '..');
const paths = fs.readFileSync(path.join(ROOT, 'icons/src/layers.svg'), 'utf8').match(/<path[^>]*\/>/g).join('');
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect width="24" height="24" fill="#1e1e2e"/>
  <g transform="translate(4.2 4.2) scale(0.65)" fill="none" stroke="#7fb8ae" stroke-width="${size <= 16 ? 2.6 : 2.2}"
     stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
const browser = await chromium.launch({ channel: 'chromium' });
const page = await browser.newPage();
for (const size of [16, 32, 48, 128]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`);
  await page.screenshot({ path: path.join(ROOT, `icons/icon-${size}.png`), omitBackground: true });
}
await browser.close();
console.log('icons/icon-{16,32,48,128}.png');
