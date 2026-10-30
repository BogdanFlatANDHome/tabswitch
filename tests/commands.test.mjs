// Public seam: Chrome command events and the external Tabs/Windows API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root)));
async function browserCommand(command, initial) {
  let listener;
  const tabs = structuredClone(initial);
  const errors = [];
  const chrome = {
    i18n: { getMessage: (key) => key },
    windows: {
      getLastFocused: async () => ({ id: 1 }),
      onRemoved: { addListener() {} },
    },
    tabs: {
      query: async (q) => tabs.filter(t => (q.windowId === undefined || t.windowId === q.windowId) && (!q.active || t.active)),
      remove: async (id) => { tabs.splice(tabs.findIndex(t => t.id === id), 1); },
      create: async ({ windowId, ...options }) => {
        // Chrome creates a new active tab at the end unless options override it.
        if (options.active !== false) tabs.filter(t => t.windowId === windowId).forEach(t => { t.active = false; });
        const tab = { id: 99, windowId, index: tabs.filter(t => t.windowId === windowId).length,
          active: true, url: 'chrome://newtab/', ...options };
        tabs.push(tab);
        return tab;
      },
    },
    commands: { onCommand: { addListener(fn) { listener = fn; } } },
    runtime: { onMessage: { addListener() {} } },
    storage: { local: { get: async () => ({}) } },
  };
  const context = vm.createContext({ chrome, self: {}, fetch: async () => ({ text: async () => '' }),
    console: { error: (...args) => errors.push(args.join(' ')) } });
  vm.runInContext(fs.readFileSync(new URL('sw.js', root), 'utf8'), context);
  listener(command);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(errors, [], 'command must not fail silently');
  return tabs;
}

const initial = [
  { id: 1, windowId: 1, index: 0, active: false, url: 'https://example.test/a' },
  { id: 2, windowId: 1, index: 1, active: true, url: 'chrome://newtab/' },
  { id: 3, windowId: 2, index: 0, active: true, url: 'https://example.test/other' },
];

test('Alt+W closes the current tab, preserving tabs in both windows', async () => {
  const tabs = await browserCommand('close-current', initial);
  assert.deepEqual(tabs.map(t => t.id), [1, 3]);
  assert.equal(manifest.commands['close-current'].suggested_key.default, 'Alt+W');
});

test('Alt+T creates one active new tab at the end of the current window', async () => {
  const tabs = await browserCommand('new-tab', initial);
  assert.equal(tabs.length, 4);
  assert.deepEqual(tabs.filter(t => t.windowId === 1 && t.active).map(t => [t.id, t.index, t.url]),
    [[99, 2, 'chrome://newtab/']]);
  assert.deepEqual(tabs.find(t => t.id === 3), initial[2], 'other window is unchanged');
  assert.equal(manifest.commands['new-tab'].suggested_key.default, 'Alt+T');
  assert.ok(Object.values(manifest.commands).filter(c => c.suggested_key).length <= 4);
});

test('Alt+A is assigned to switching between the last two tabs', () => {
  assert.equal(manifest.commands['toggle-last'].suggested_key?.default, 'Alt+A');
});
