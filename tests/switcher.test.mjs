// Поведение переключателя вкладок: что видит и что получает человек.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { start, rows, selected, box } from './harness.mjs';

let h;
before(async () => { h = await start(); });
after(async () => { await h?.stop(); });

test('Alt+Q: окошко по центру; текущая вкладка первой, дальше по порядку в браузере, слева её номер', async () => {
  const [, , c] = await h.openTabs('a', 'b', 'c');
  await h.command();
  await box(c).waitFor();
  assert.deepEqual((await rows(c)).slice(0, 3), ['Страница C', 'Страница A', 'Страница B']);
  assert.deepEqual((await c.locator('#tabswitch-host .row .num').allTextContents()).slice(0, 3), ['3', '1', '2']);
  assert.equal(await selected(c), 'Страница C');
  const r = await box(c).boundingBox();
  assert.ok(Math.abs(r.x + r.width / 2 - 640) <= 2, `по центру по ширине: x=${r.x} w=${r.width}`);
  await c.keyboard.press('Escape');
});

test('↓ и Enter — переход на следующую по списку (первую в браузере) вкладку, окошко исчезло', async () => {
  const [, , c] = await h.openTabs('d', 'e', 'f');
  await h.command();
  await box(c).waitFor();
  await c.keyboard.press('ArrowDown');
  await c.keyboard.press('Enter');
  await box(c).waitFor({ state: 'detached' });
  assert.equal(await h.activeTitle(), 'Страница D');
});

test('размер окошка не меняется: 3 вкладки в списке или 1 после поиска', async () => {
  const [, , c] = await h.openTabs('size1', 'size2', 'size3');
  await h.command();
  await box(c).waitFor();
  const a = await box(c).boundingBox();
  await c.keyboard.type('size1');
  assert.deepEqual(await rows(c), ['Страница SIZE1']);
  const b = await box(c).boundingBox();
  assert.deepEqual([b.width, b.height], [a.width, a.height]);
  await c.keyboard.press('Escape');
});

test('поиск: напечатал часть названия — в списке только она, Enter — переход', async () => {
  const [, , c] = await h.openTabs('kiwi', 'lemon', 'mango');
  await h.command();
  await box(c).waitFor();
  await c.keyboard.type('kiw');
  assert.deepEqual(await rows(c), ['Страница KIWI']);
  await c.keyboard.press('Enter');
  await c.waitForTimeout(200);
  assert.equal(await h.activeTitle(), 'Страница KIWI');
});

test('держишь Alt, Q ещё раз — подсветка на следующей по списку; отпустил Alt — переход', async () => {
  const [, , c] = await h.openTabs('g', 'h', 'i');
  await c.keyboard.down('Alt');
  await h.command();
  await box(c).waitFor();
  await h.command();
  assert.equal(await selected(c), 'Страница G');
  await c.keyboard.up('Alt');
  await box(c).waitFor({ state: 'detached' });
  await c.waitForTimeout(200);
  assert.equal(await h.activeTitle(), 'Страница G');
});

test('Alt+Q и отпустил Alt — подсветка на текущей, окошко остаётся (можно искать)', async () => {
  const [, , c] = await h.openTabs('j', 'k', 'l');
  await c.keyboard.down('Alt');
  await h.command();
  await box(c).waitFor();
  await c.keyboard.up('Alt');
  await c.waitForTimeout(150);
  assert.ok(await box(c).isVisible());
  assert.equal(await h.activeTitle(), 'Страница L');
  await c.keyboard.press('Escape');
});

test('Esc — окошко закрыто, вкладка та же; клавиши страница не получила', async () => {
  const [, , c] = await h.openTabs('m', 'n', 'o');
  await c.evaluate(() => { window.__keys = 0; addEventListener('keydown', () => window.__keys++); });
  await h.command();
  await box(c).waitFor();
  await c.keyboard.type('zz');
  await c.keyboard.press('Escape');
  await box(c).waitFor({ state: 'detached' });
  assert.equal(await h.activeTitle(), 'Страница O');
  assert.equal(await c.evaluate(() => window.__keys), 0);
});

test('Delete — выбранная вкладка закрыта, список обновился', async () => {
  const [, , c] = await h.openTabs('p', 'q', 'r');
  await h.command();
  await box(c).waitFor();
  await c.keyboard.press('ArrowDown');
  await c.keyboard.press('Delete');
  await c.waitForTimeout(200);
  const titles = await rows(c);
  assert.ok(!titles.includes('Страница P'), `P осталась: ${titles}`);
  assert.equal(await selected(c), 'Страница Q');
  const open = await h.sw.evaluate(async () => (await chrome.tabs.query({})).map((t) => t.title));
  assert.ok(!open.includes('Страница P'));
  await c.keyboard.press('Escape');
});

test('вкладка в другом окне видна в списке; выбор делает её активной', async () => {
  await h.sw.evaluate(async (url) => { await chrome.windows.create({ url, focused: true }); }, `${h.base}/other`);
  await h.context.waitForEvent('page', { predicate: (p) => p.url().endsWith('/other') }).catch(() => {});
  await new Promise((r) => setTimeout(r, 300));
  const [, s] = await h.openTabs('s', 't', { keep: true });
  await h.command();
  await box(s).waitFor();
  await s.keyboard.type('other');
  assert.deepEqual(await rows(s), ['Страница OTHER']);
  await s.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await h.activeTitle(), 'Страница OTHER');
});

test('служебная страница (chrome://) — то же окошко отдельным окном, выбор работает', async () => {
  const [u] = await h.openTabs('u');
  const blank = await h.context.newPage();
  await blank.goto('chrome://version');
  await blank.bringToFront();
  const popupP = h.context.waitForEvent('page', { predicate: (p) => p.url().endsWith('/switcher.html') });
  await h.command();
  const popup = await popupP;
  await popup.locator('.row').first().waitFor();
  await popup.waitForTimeout(300);
  assert.equal(await popup.locator('.row.sel .title').textContent(), await blank.title(), 'подсветка на текущей вкладке');
  // у Chrome бывает масштаб по умолчанию 125% — окно всё равно того же вида, что окошко в странице
  await h.sw.evaluate(async () => {
    const [t] = await chrome.tabs.query({ url: chrome.runtime.getURL('switcher.html') });
    await chrome.tabs.setZoom(t.id, 1.25);
  });
  await popup.waitForTimeout(300);
  const rowPx = await popup.evaluate(() => document.querySelector('.row').getBoundingClientRect().height * 1.25);
  assert.ok(Math.abs(rowPx - 38) < 1, `строка на экране ${rowPx}px, ждали 38`);
  // окно ровно по содержимому (размер, который просит расширение, = размер окошка на экране при масштабе 125%).
  // Headless сам размер окна не применяет — сверяем запрошенный размер с содержимым
  const want = await h.sw.evaluate(async () => (await chrome.storage.session.get('popupSize')).popupSize);
  const got = await popup.evaluate(() => {
    const b = document.querySelector('.box').getBoundingClientRect();
    return { width: b.width * 1.25, height: b.height * 1.25 };
  });
  assert.ok(Math.abs(want.width - got.width) <= 2 && Math.abs(want.height - got.height) <= 2,
    `окно ${JSON.stringify(want)}, содержимое ${JSON.stringify(got)}`);
  await popup.keyboard.type('Страница U');
  await popup.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(await h.activeTitle(), 'Страница U');
  assert.ok(popup.isClosed(), 'запасное окно закрылось');
  await blank.close();
  void u;
});

test('скорость: окошко видно меньше чем через 100 мс после команды', async () => {
  const [, w] = await h.openTabs('v', 'w');
  await h.command(); await box(w).waitFor(); await w.keyboard.press('Escape'); // прогрев
  const t0 = Date.now();
  await h.command();
  await box(w).waitFor();
  const ms = Date.now() - t0;
  await w.keyboard.press('Escape');
  assert.ok(ms < 100, `${ms} мс`);
});

test('масштаб страницы 150% — окошко того же размера на экране', async () => {
  const [, y] = await h.openTabs('x', 'y');
  await h.command(); await box(y).waitFor();
  const a = await y.locator('#tabswitch-host').evaluate((el) => el.shadowRoot.querySelector('.box').getBoundingClientRect().width);
  await y.keyboard.press('Escape');
  await h.sw.evaluate(async () => { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); await chrome.tabs.setZoom(t.id, 1.5); });
  await y.waitForTimeout(200);
  await h.command(); await box(y).waitFor();
  // ширина на экране = ширина в CSS-пикселях страницы (zoom хоста уже учтён) × масштаб страницы
  const b = await y.locator('#tabswitch-host').evaluate((el) => el.shadowRoot.querySelector('.box').getBoundingClientRect().width * 1.5);
  await y.keyboard.press('Escape');
  await h.sw.evaluate(async () => { const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true }); await chrome.tabs.setZoom(t.id, 1); });
  assert.ok(Math.abs(a - b) < 3, `без масштаба ${a}px, при 150% ${b}px`);
});

test('группы по окнам: сначала «Это окно», ниже «Окно 2 · <его активная вкладка>»', async () => {
  // свежий браузер: окно 1 — W1A, W1B (активна); окно 2 (создано последним, в нём жмём Alt+Q) — W2A, W2B
  await h.stop();
  h = await start();
  await h.openTabs('w1a', 'w1b');
  await h.sw.evaluate(async (base) => {
    const w = await chrome.windows.create({ url: `${base}/w2a` });
    await chrome.tabs.create({ windowId: w.id, url: `${base}/w2b`, active: true });
  }, h.base);
  await new Promise((r) => setTimeout(r, 800));
  const p = h.context.pages().find((x) => x.url().endsWith('/w2b'));
  await h.command();
  await box(p).waitFor();
  assert.deepEqual(await p.locator('#tabswitch-host .group').allTextContents(), ['Это окно', 'Окно 2 · Страница W1B']);
  const all = await rows(p);
  assert.deepEqual(all.filter((t) => /W[12]/.test(t)), ['Страница W2B', 'Страница W2A', 'Страница W1A', 'Страница W1B']);
  await p.keyboard.type('w1a');
  assert.deepEqual(await p.locator('#tabswitch-host .group').allTextContents(), ['Окно 2 · Страница W1B']);
  await p.keyboard.press('Escape');
});

test('много раз подряд (открыл-закрыл, открыл-перешёл) — всегда окошко в странице, отдельное окно не вылезает', async () => {
  const pages = await h.openTabs('r1', 'r2', 'r3');
  let popups = 0;
  const onPage = (p) => { if (p.url().includes('switcher.html')) popups++; };
  h.context.on('page', onPage);
  for (let i = 0; i < 12; i++) {
    const p = pages.find((x) => x.url().endsWith(`/r${3 - (i % 3)}`)) ?? pages[2];
    await h.command();
    const cur = (await Promise.all(pages.map(async (x) => [x, await box(x).count()]))).find(([, n]) => n)?.[0];
    assert.ok(cur, `раз ${i + 1}: окошка нет ни в одной вкладке (popups=${popups})`);
    if (i % 2) await cur.keyboard.press('Escape');
    else { await cur.keyboard.press('ArrowDown'); await cur.keyboard.press('Enter'); }
    await cur.waitForTimeout(120);
    void p;
  }
  h.context.off('page', onPage);
  assert.equal(popups, 0);
});

test('Alt+W — на прошлую вкладку и обратно', async () => {
  const [, b, c] = await h.openTabs('aw', 'bw', 'cw');
  await h.toggle();
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await h.activeTitle(), 'Страница BW');
  await h.toggle();
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await h.activeTitle(), 'Страница CW');
  void b; void c;
});

test('светлая тема Chrome — окошко светлое, тёмная — тёмное', async () => {
  const [, p] = await h.openTabs('t1', 't2');
  const bg = () => box(p).evaluate((el) => getComputedStyle(el).backgroundColor);
  await p.emulateMedia({ colorScheme: 'light' });
  await h.command(); await box(p).waitFor();
  const light = await bg();
  await p.emulateMedia({ colorScheme: 'dark' }); // переключили тему при открытом окошке — оно перекрасилось
  const dark = await bg();
  await p.keyboard.press('Escape');
  assert.equal(dark, 'rgb(30, 30, 46)');
  assert.equal(light, 'rgb(239, 241, 245)');
});
