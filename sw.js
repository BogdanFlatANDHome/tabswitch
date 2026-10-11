// Tab Switch — service worker. Alt+Q: собрать вкладки (текущая первой, дальше по порядку в браузере) и показать окошко.
// Окошко рисуется в текущей странице (ui.js + overlay.js — content scripts, доступ ко всем сайтам: без него
// Chrome иногда не давал вставить окошко, и вылезало запасное окно). Где Chrome скрипты не пускает (новая вкладка,
// chrome://, магазин) — то же окошко отдельным маленьким окном switcher.html по центру.
// Повторный Alt+Q, пока окошко открыто, двигает подсветку вниз. Состояния в переменных не держим — worker засыпает.

// Вкладки группами по окнам: сначала окно, где нажали Alt+Q, потом остальные — от недавнего к давнему.
// Внутри окна — как в полоске вкладок браузера (слева номер), только текущая вкладка первой.
// У первой вкладки окна — подпись группы
const t = (key, subs) => chrome.i18n.getMessage(key, subs);

async function collect(cur) {
  const all = await chrome.tabs.query({ windowType: 'normal' });
  const byWin = new Map();
  for (const t of all) byWin.set(t.windowId, [...(byWin.get(t.windowId) ?? []), t]);
  const last = (tabs) => Math.max(...tabs.map((t) => t.lastAccessed ?? 0));
  const wins = [...byWin.entries()].sort(([a, ta], [b, tb]) =>
    (b === cur.windowId) - (a === cur.windowId) || last(tb) - last(ta));
  const items = [];
  wins.forEach(([winId, tabs], n) => {
    tabs.sort((a, b) => (b.id === cur.id) - (a.id === cur.id) || a.index - b.index);
    const active = tabs.find((t) => t.active) ?? tabs[0];
    const group = winId === cur.windowId ? t('thisWindow') : t('otherWindow', [String(n + 1), active.title || active.url]);
    tabs.forEach((tab, k) => items.push({
      id: tab.id,
      windowId: tab.windowId,
      num: tab.index + 1,
      title: tab.title || tab.url || t('untitled'),
      url: tab.url || '',
      icon: favicon(tab.url),
      group: wins.length > 1 && k === 0 ? group : '',
    }));
  });
  return items;
}

function favicon(url) {
  const u = new URL(chrome.runtime.getURL('/_favicon/'));
  u.searchParams.set('pageUrl', url || 'about:blank');
  u.searchParams.set('size', '32');
  return u.toString();
}

async function currentTab() {
  const w = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
  const [t] = await chrome.tabs.query({ active: true, windowId: w.id });
  return t;
}

// Для разработки: `just reload` пишет новую метку в stamp.txt. Распакованное расширение читает файлы с диска,
// а код worker'а Chrome держит старый до перезагрузки. На Alt+Q сверяем метку с запомненной в storage:
// новая — запоминаем и перезагружаем расширение (не нужно жать ↻ в chrome://extensions)
async function reloadIfChanged() {
  const now = await fetch('stamp.txt', { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
  const { stamp } = await chrome.storage.local.get('stamp');
  if (!now || now === stamp) return false;
  await chrome.storage.local.set({ stamp: now });
  if (stamp === undefined) return false; // первый запуск после установки — код и так свежий
  chrome.runtime.reload();
  return true;
}

// Открыть окошко или, если оно уже открыто, сдвинуть подсветку вниз (Alt+Q ещё раз с зажатым Alt)
async function openSwitcher() {
  const { popupId } = await chrome.storage.session.get('popupId');
  if (popupId) {
    try { await chrome.runtime.sendMessage({ type: 'next' }); return; } catch { /* окно закрыли */ }
    await chrome.storage.session.remove('popupId');
  }
  const tab = await currentTab();
  const items = await collect(tab);
  try {
    // ui.js и overlay.js уже в каждой странице (content_scripts); во вкладки, открытые до установки, — докладываем
    const zoom = await chrome.tabs.getZoom(tab.id).catch(() => 1); // масштаб страницы окошко гасит
    const run = () => chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (list, z) => {
        const ts = globalThis.__tabswitch;
        if (!ts) return false;
        if (ts.isOpen()) ts.next(); else ts.open(list, z);
        return true;
      },
      args: [items, zoom],
    });
    const [{ result: ok }] = await run();
    if (!ok) {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['ui.js', 'overlay.js'] });
      await run();
    }
  } catch {
    await openPopup(tab, items);
  }
}
self.openSwitcher = openSwitcher; // для тестов: тот же путь, что у Alt+Q

const POPUP_CHROME = 68; // поле поиска ~36 + отступ 8 + поля 12×2
async function openPopup(tab, items) {
  await chrome.storage.session.set({ items });
  const w = await chrome.windows.get(tab.windowId);
  // размер — как у окошка в странице: строки по 38px (до 10), подписи окон по 31px, сверху поле поиска и отступы
  const groups = Math.min(items.filter((it) => it.group).length, 3);
  const width = 640, height = Math.min(Math.max(items.length, 1), 10) * 38 + groups * 31 + POPUP_CHROME;
  const win = await chrome.windows.create({
    url: 'switcher.html', type: 'popup', width, height, focused: true,
    left: Math.round(w.left + (w.width - width) / 2), top: Math.round(w.top + (w.height - height) / 3),
  });
  await chrome.storage.session.set({ popupId: win.id, popupSize: { width, height } });
}

chrome.windows.onRemoved.addListener(async (id) => {
  const { popupId } = await chrome.storage.session.get('popupId');
  if (popupId === id) await chrome.storage.session.remove('popupId');
});

// Alt+W — на вкладку, где был до этой (по всем окнам), и обратно
async function toggleLast() {
  const cur = await currentTab();
  const tabs = await chrome.tabs.query({ windowType: 'normal' });
  const prev = tabs.filter((t) => t.id !== cur.id).sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
  if (!prev) return;
  await chrome.tabs.update(prev.id, { active: true });
  await chrome.windows.update(prev.windowId, { focused: true });
}
self.toggleLast = toggleLast;

// Alt+← / Alt+→ — соседняя вкладка в этом окне; с края — на другой край (как Ctrl+Tab)
async function stepTab(d) {
  const cur = await currentTab();
  const tabs = await chrome.tabs.query({ windowId: cur.windowId });
  const next = tabs.find((t) => t.index === (cur.index + d + tabs.length) % tabs.length);
  if (next) await chrome.tabs.update(next.id, { active: true });
}
self.stepTab = stepTab;

chrome.commands.onCommand.addListener((cmd) => {
  const run = { 'open-switcher': openSwitcher, 'toggle-last': toggleLast,
    'tab-left': () => stepTab(-1), 'tab-right': () => stepTab(1) }[cmd];
  (async () => { if (!(await reloadIfChanged())) await run?.(); })().catch((e) => console.error('tabswitch:', e));
});

// Действия из окошка: перейти на вкладку, закрыть вкладку
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    if (msg.type === 'activate') {
      await chrome.tabs.update(msg.tabId, { active: true });
      await chrome.windows.update(msg.windowId, { focused: true });
    } else if (msg.type === 'close') {
      await chrome.tabs.remove(msg.tabId);
    }
    reply({ ok: true });
  })().catch((e) => reply({ ok: false, error: String(e) }));
  return true;
});
