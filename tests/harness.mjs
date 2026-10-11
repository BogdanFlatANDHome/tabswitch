// Общий запуск для тестов: Chromium с расширением (копия во временной папке), локальный сервер страниц.
// Команду «открыть переключатель» зовём напрямую в worker'е: сочетания браузера синтетическими нажатиями не вызвать.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Playwright — из глобального @playwright/cli (NODE_PATH задаёт justfile); ESM-импорт NODE_PATH не видит
const { chromium } = createRequire(import.meta.url)('playwright');
const ROOT = path.resolve(import.meta.dirname, '..');

export async function start() {
  const ext = fs.mkdtempSync(path.join(os.tmpdir(), 'tabswitch-ext-'));
  fs.cpSync(ROOT, ext, { recursive: true, filter: (p) => !p.includes(`${path.sep}tests`) && !p.endsWith('.zip') });

  // страницы /a /b /c … с заголовком «Страница A» и т. п.
  const server = http.createServer((req, res) => {
    const name = req.url.slice(1).toUpperCase() || 'ROOT';
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<!doctype html><title>Страница ${name}</title><body style="margin:0;height:100vh">${name}</body>`);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tabswitch-profile-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    // интерфейс Chrome по-русски — подписи окошка из _locales/ru
    env: { ...process.env, LANGUAGE: 'ru', LANG: 'ru_RU.UTF-8' },
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--lang=ru'],
  });
  let sw = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');

  // открыть вкладки по очереди: последняя — активная. Остальные вкладки браузера закрываются, чтобы порядок
  // в полоске вкладок был ровно таким (keep: true — не закрывать)
  async function openTabs(...names) {
    const keep = typeof names.at(-1) === 'object' ? names.pop().keep : false;
    const old = keep ? [] : context.pages();
    const pages = [];
    for (const n of names) {
      const p = await context.newPage();
      await p.goto(`${base}/${n}`);
      await p.bringToFront();
      pages.push(p);
      await p.waitForTimeout(30); // разное «время последнего показа»
    }
    for (const p of old) await p.close();
    return pages;
  }
  const command = () => sw.evaluate(() => self.openSwitcher());
  const toggle = () => sw.evaluate(() => self.toggleLast());
  const step = (d) => sw.evaluate((x) => self.stepTab(x), d);
  const activeTitle = () => sw.evaluate(async () => {
    const w = await chrome.windows.getLastFocused();
    const [t] = await chrome.tabs.query({ active: true, windowId: w.id });
    return t.title;
  });
  async function stop() {
    await context.close();
    server.close();
    fs.rmSync(ext, { recursive: true, force: true });
    fs.rmSync(profile, { recursive: true, force: true });
  }
  return { context, base, openTabs, command, toggle, step, activeTitle, stop, get sw() { return sw; } };
}

// строки списка в окошке (оно в Shadow DOM — локаторы Playwright проходят сквозь открытый shadow root)
export const rows = (page) => page.locator('#tabswitch-host .row .title').allTextContents();
export const selected = (page) => page.locator('#tabswitch-host .row.sel .title').textContent();
export const box = (page) => page.locator('#tabswitch-host .box');
