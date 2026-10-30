# Tab Switch

A fast, minimal tab switcher for Chrome. Press **Alt+Q** and every open tab appears in one centered list —
numbered like the tab strip, grouped by window, searchable as you type.

![Dark theme](store/screenshot-dark.png)

## Keys

| Key | Action |
|---|---|
| **Alt+Q** | Open the list. The current tab is highlighted |
| **Alt+Q** again (keep Alt held) | Move down; release **Alt** to switch |
| Type | Filter by title and address |
| **↑ ↓**, **Tab** | Move |
| **Enter** | Switch to the tab (focuses its window) |
| **Delete** / **Ctrl+Backspace** | Close the highlighted tab |
| **Esc** | Close the list |
| **Alt+W** | Close the current tab |
| **Alt+T** | Open a new active tab |
| **Alt+A** | Jump to the previous tab and back |
| Assign in shortcut settings | Neighbour tab left/right in this window (wraps around) |

- Current window first, other windows below under «Window 2 · <its active tab>».
- Light and dark look follow Chrome's appearance setting, live.
- Size never jumps: fixed when opened, unaffected by page zoom.
- On Chrome's own pages (New Tab, `chrome://…`) extensions can't draw inside the page, so the same list opens
  as a small window over Chrome.
- Shortcuts can be changed at `chrome://extensions/shortcuts`. After upgrading, clear the old Alt+W assignment for previous-tab switching and assign Alt+A to it; assign Alt+W to close and Alt+T to new tab. Chrome can retain old assignments.
- Chrome permits four default shortcuts. Left/right neighbour commands remain available for manual assignment.

## Privacy

Nothing leaves your browser. No analytics, no network requests, no data stored except a development marker.
See [PRIVACY.md](PRIVACY.md).

## Install from source

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.

## Develop

Requires [`just`](https://github.com/casey/just) and Playwright (`npm i -g @playwright/cli` provides it).

```
just check    # syntax + behaviour tests in Chromium (Playwright)
just reload   # after editing: the next Alt+Q in your Chrome reloads the extension
just icons    # icons/icon-*.png from icons/src/layers.svg
just screens  # store screenshots 1280×800
just pack     # tabswitch.zip for the Chrome Web Store
```

## Credits

Icon: [Lucide](https://lucide.dev) «layers» (ISC license). Colors: [Catppuccin](https://catppuccin.com) Mocha / Latte.

## License

MIT

---

## По-русски

Быстрый минималистичный переключатель вкладок Chrome. **Alt+Q** — все вкладки одним списком по центру: с номерами,
как в полоске вкладок, по окнам, с поиском. Держишь Alt и жмёшь Q — подсветка ниже, отпустил Alt — переход.
**Alt+W** — закрыть текущую вкладку, **Alt+T** — новая вкладка, **Alt+A** — на прошлую и обратно.
Команды соседних вкладок назначаются вручную в `chrome://extensions/shortcuts`. После обновления проверьте
назначения: Chrome может сохранить старое Alt+W на переключение. Светлая и тёмная тема — как у Chrome.
