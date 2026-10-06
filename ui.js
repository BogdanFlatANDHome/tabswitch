// Tab Switch — окошко со списком вкладок (общее для страницы и запасного окна).
// globalThis.TabSwitchUI.mount(root, items, { activate, close, done, inline }) рисует список в root
// (ShadowRoot или document.body) и ведёт клавиатуру. Catppuccin (Mocha / Latte по теме Chrome), углы острые.
if (!globalThis.TabSwitchUI) {
  // Цвета — под тему Chrome (светлая / тёмная, prefers-color-scheme): Catppuccin Latte и Mocha.
  // Тему переключили при открытом окошке — оно перекрашивается сразу
  const CSS = `
    :host, .wrap { all: initial; }
    .wrap {
      --base: #1e1e2e; --surface0: #313244; --surface1: #45475a; --surface2: #585b70; --overlay0: #6c7086;
      --text: #cdd6f4; --accent: #7fb8ae; --on-accent: #1e1e2e; --shadow: rgba(0,0,0,.45);
    }
    @media (prefers-color-scheme: light) {
      .wrap {
        --base: #eff1f5; --surface0: #dce0e8; --surface1: #bcc0cc; --surface2: #9ca0b0; --overlay0: #7c7f93;
        --text: #4c4f69; --accent: #2f8f86; --on-accent: #eff1f5; --shadow: rgba(76,79,105,.25);
      }
    }
    .wrap { position: fixed; inset: 0; z-index: 2147483647; display: flex; justify-content: center;
      align-items: flex-start; padding-top: 18vh; font: 14px/1.4 "JetBrainsMono Nerd Font", "JetBrains Mono", monospace; }
    .wrap.inline { position: static; padding: 0; }
    .box { width: 640px; max-width: calc(100vw - 32px); box-sizing: border-box; background: var(--base);
      border: 2px solid var(--accent); padding: 12px; color: var(--text); box-shadow: 0 12px 40px var(--shadow); }
    .inline .box { width: 640px; max-width: none; border: 0; box-shadow: none; }
    .bar { display: flex; align-items: center; gap: 10px; background: var(--surface0); padding: 8px 12px; margin-bottom: 8px; }
    .bar .icon { color: var(--accent); }
    input { all: unset; flex: 1; color: var(--text); font: inherit; caret-color: var(--accent); }
    input::placeholder { color: var(--overlay0); }
    .list { height: 380px; box-sizing: content-box; overflow-y: auto; scrollbar-width: thin;
      scrollbar-color: var(--surface1) transparent; }
    .row { display: flex; align-items: center; gap: 12px; height: 38px; padding: 0 12px; cursor: pointer; }
    .row img, .row .fb { width: 16px; height: 16px; flex: none; }
    .row .num { width: 2ch; margin-right: -4px; flex: none; text-align: right; color: var(--surface2); font-size: 11px;
      font-variant-numeric: tabular-nums; }
    .row.sel .num { color: var(--on-accent); opacity: .6; }
    .row .fb { display: grid; place-items: center; background: var(--surface1); color: var(--text); font-size: 11px; }
    .row .title { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
    .row .host { flex: none; max-width: 38%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      color: var(--overlay0); font-size: 12px; }
    .row.cur .title::before { content: "● "; color: var(--accent); }
    .row:hover { background: var(--surface0); }
    .row.sel { background: var(--accent); }
    .row.sel .title, .row.sel .host, .row.sel.cur .title::before { color: var(--on-accent); }
    .empty { color: var(--overlay0); padding: 10px 12px; }
    .group { height: 26px; line-height: 26px; padding: 0 12px; margin-top: 4px; color: var(--accent); font-size: 11px;
      letter-spacing: .06em; text-transform: uppercase; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      border-top: 1px solid var(--surface0); }
    .group:first-child { margin-top: 0; border-top: 0; }
  `;


  const msg = (key) => chrome.i18n.getMessage(key);
  const host = (url) => { try { return new URL(url).host || url; } catch { return url; } };
  const match = (it, words) => {
    const hay = `${it.title} ${it.url}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  };

  globalThis.TabSwitchUI = {
    // items[0] — текущая вкладка. Подсветка стартует на ней; Alt+Q ещё раз (next) — вниз.
    // Отпустил Alt: подсветка ушла с текущей — переход; осталась — окошко ждёт поиска
    mount(root, items, api) {
      const style = document.createElement('style');
      style.textContent = CSS;
      const wrap = document.createElement('div');
      wrap.className = 'wrap' + (api.inline ? ' inline' : '');
      wrap.innerHTML = `<div class="box" role="dialog">
        <div class="bar"><span class="icon">󰖯</span><input spellcheck="false" autocomplete="off"></div>
        <div class="list" role="listbox"></div></div>`;
      root.append(style, wrap);
      const input = wrap.querySelector('input');
      input.placeholder = msg('placeholder');
      wrap.querySelector('.box').setAttribute('aria-label', msg('placeholder'));
      const list = wrap.querySelector('.list');
      const current = items[0];
      // высота — по числу вкладок при открытии (до 10 строк) и дальше не меняется, даже при поиске
      const groups = items.filter((it) => it.group).length;
      list.style.height = `${Math.min(Math.max(items.length, 1), 10) * 38 + Math.min(groups, 3) * 31}px`;
      let shown = items;
      let sel = 0;

      // строки создаются один раз на вкладку: при движении подсветки ничего не перерисовывается (без мигания значков)
      const rowOf = new Map(items.map((it) => [it, makeRow(it)]));
      function makeRow(it) {
        const row = document.createElement('div');
        row.className = 'row' + (it === current && !api.inline ? ' cur' : '');
        row.setAttribute('role', 'option');
        const img = document.createElement('img');
        img.src = it.icon;
        img.alt = '';
        img.addEventListener('error', () => {
          const fb = document.createElement('span');
          fb.className = 'fb';
          fb.textContent = (host(it.url)[0] || '?').toUpperCase();
          img.replaceWith(fb);
        });
        const t = document.createElement('span');
        t.className = 'title';
        t.textContent = it.title;
        const h = document.createElement('span');
        h.className = 'host';
        h.textContent = host(it.url);
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = it.num ?? '';
        row.append(num, img, t, h);
        row.addEventListener('mousedown', (e) => { e.preventDefault(); sel = shown.indexOf(it); choose(); });
        return row;
      }

      // подпись окна — перед первой показанной вкладкой этого окна (при поиске пустые окна пропадают)
      const groupOf = new Map();
      { let g = ''; for (const it of items) { if (it.group) g = it.group; groupOf.set(it, g); } }
      function header(text) {
        const d = document.createElement('div');
        d.className = 'group';
        d.textContent = text;
        return d;
      }
      function render() {
        const nodes = [];
        let last = null;
        for (const it of shown) {
          const g = groupOf.get(it);
          if (g && g !== last) nodes.push(header(g));
          last = g;
          nodes.push(rowOf.get(it));
        }
        list.replaceChildren(...nodes);
        if (!shown.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = msg('nothing'); list.replaceChildren(e); }
        highlight();
      }
      function highlight() {
        list.querySelector('.row.sel')?.classList.remove('sel');
        const row = rowOf.get(shown[sel]);
        if (!row) return;
        row.classList.add('sel');
        // прокрутка только списка (scrollIntoView дёргал бы и саму страницу)
        if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
        else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight)
          list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
      }
      function move(d) {
        if (!shown.length) return;
        sel = (sel + d + shown.length) % shown.length;
        highlight();
      }
      function choose() {
        const it = shown[sel];
        api.done();
        if (it && it !== current) api.activate(it);
      }
      async function closeSelected() {
        const it = shown[sel];
        if (!it) return;
        await api.close(it);
        items = items.filter((x) => x !== it);
        shown = shown.filter((x) => x !== it);
        sel = Math.max(0, Math.min(sel, shown.length - 1));
        render();
      }

      input.addEventListener('input', () => {
        const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        shown = words.length ? items.filter((it) => match(it, words)) : items;
        sel = 0;
        render();
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) { move(1); }
        else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) { move(-1); }
        else if (e.key === 'Enter') { choose(); }
        else if (e.key === 'Escape') { api.done(); }
        else if (e.key === 'Delete' || (e.key === 'Backspace' && e.ctrlKey)) { closeSelected(); }
        else return;
        e.preventDefault();
      });
      input.addEventListener('keyup', (e) => {
        if (e.key === 'Alt' && !input.value && shown[sel] !== current) choose();
      });

      render();
      input.focus();
      return { next() { move(1); }, wrap };
    },
  };
}
