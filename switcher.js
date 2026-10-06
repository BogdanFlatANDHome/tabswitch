// Tab Switch — запасное окно для страниц, куда Chrome скрипты не пускает (новая вкладка, chrome://, магазин).
// Список кладёт service worker в storage.session; повторный Alt+Q приходит сообщением «next».
(async () => {
  document.title = chrome.i18n.getMessage('placeholder');
  const { items = [] } = await chrome.storage.session.get('items');
  // масштаб Chrome по умолчанию (бывает 125%) гасим: окно того же вида и размера, что окошко в странице
  const me = await chrome.tabs.getCurrent();
  const unzoom = (z) => { document.documentElement.style.zoom = String(1 / z); };
  unzoom(await chrome.tabs.getZoom(me.id));
  chrome.tabs.onZoomChange.addListener((e) => { if (e.tabId === me.id) unzoom(e.newZoomFactor); });
  const ui = TabSwitchUI.mount(document.body, items, {
    inline: true,
    activate: (it) => chrome.runtime.sendMessage({ type: 'activate', tabId: it.id, windowId: it.windowId }),
    close: (it) => chrome.runtime.sendMessage({ type: 'close', tabId: it.id }),
    done: () => setTimeout(() => window.close(), 50),
  });
  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg.type === 'next') { ui.next(); reply({ ok: true }); }
  });
  window.addEventListener('blur', () => window.close()); // ушёл в другое окно — закрыться
})();
