// Tab Switch — окошко прямо в странице: Shadow DOM (стили сайта не мешают), клавиши страницы не получают.
if (!globalThis.__tabswitch) {
  let host = null;
  let ui = null;
  const block = (e) => { if (host && !e.composedPath().includes(host)) e.stopPropagation(); };

  function close() {
    host?.remove();
    host = ui = null;
    for (const t of ['keydown', 'keyup', 'keypress']) window.removeEventListener(t, block, true);
  }

  globalThis.__tabswitch = {
    isOpen: () => !!host,
    open(items, zoom = 1) {
      close();
      host = document.createElement('div');
      host.id = 'tabswitch-host';
      host.style.zoom = String(1 / zoom);
      const root = host.attachShadow({ mode: 'open' });
      // нажатия в окошке дальше хоста не всплывают — сочетания сайта (Gmail, YouTube…) не срабатывают
      for (const t of ['keydown', 'keyup', 'keypress', 'input']) host.addEventListener(t, (e) => e.stopPropagation());
      document.documentElement.append(host);
      for (const t of ['keydown', 'keyup', 'keypress']) window.addEventListener(t, block, true);
      ui = TabSwitchUI.mount(root, items, {
        activate: (it) => chrome.runtime.sendMessage({ type: 'activate', tabId: it.id, windowId: it.windowId }),
        close: (it) => chrome.runtime.sendMessage({ type: 'close', tabId: it.id }),
        done: close,
      });
      // щелчок мимо окошка — закрыть
      ui.wrap.addEventListener('mousedown', (e) => { if (e.target === ui.wrap) close(); });
    },
    next() { ui?.next(); },
  };
}
