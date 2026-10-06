// Скриншоты для магазина (1280×800): тёмная и светлая тема Chrome. Запуск: just screens → store/screenshot-*.png
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(import.meta.dirname, '..');
const TABS = [['mail.example.com', 'Inbox (3) — Mail'], ['code.example.com', 'Pull requests · tabswitch'],
  ['docs.example.com', 'Quarterly report — Docs'], ['weather.example.com', 'Weather forecast'],
  ['music.example.com', 'Music — Playlist'], ['blog.example.com', 'Release notes 1.3'],
  ['figma.example.com', 'Design system — Figma']];
const server = http.createServer((req, res) => {
  const i = Number(req.url.slice(1)) || 0;
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><title>${TABS[i][1]}</title><body style="margin:0;height:100vh;font:20px sans-serif;
    background:linear-gradient(135deg,#89b4fa33,#7fb8ae33)">`);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
fs.mkdirSync(path.join(ROOT, 'store'), { recursive: true });
for (const scheme of ['dark', 'light']) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tabswitch-shot-'));
  const ctx = await chromium.launchPersistentContext(profile, {
    // 853×533 при масштабе 1.5 = снимок 1280×800, окошко крупнее. Адреса — вымышленные домены на локальный сервер
    channel: 'chromium', headless: true, viewport: { width: 853, height: 533 }, deviceScaleFactor: 1.5, colorScheme: scheme,
    env: { ...process.env, LANGUAGE: 'en', LANG: 'en_US.UTF-8' },
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, '--lang=en',
      `--host-resolver-rules=MAP * 127.0.0.1:${server.address().port}`],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  let page;
  for (let i = 0; i < TABS.length; i++) {
    page = await ctx.newPage();
    await page.goto(`http://${TABS[i][0]}/${i}`);
  }
  await page.bringToFront();
  for (const p of ctx.pages()) if (p.url() === 'about:blank') await p.close();
  await sw.evaluate(() => self.openSwitcher());
  await page.locator('#tabswitch-host .box').waitFor();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ROOT, `store/screenshot-${scheme}.png`) });
  await ctx.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
server.close();
console.log('store/screenshot-dark.png store/screenshot-light.png');
