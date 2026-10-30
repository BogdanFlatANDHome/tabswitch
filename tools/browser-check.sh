#!/usr/bin/env bash
# Isolated from the user's Chrome profile; verifies real Chrome registration.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .playwright-cli
python3 - <<'PY'
from pathlib import Path
import json, tempfile
root = Path.cwd()
config = {'browser': {'browserName': 'chromium', 'isolated': False,
    'userDataDir': tempfile.mkdtemp(prefix='tabswitch-browser-'),
    'launchOptions': {'channel': 'chromium', 'headless': True, 'args': [
        '--disable-extensions-except=' + str(root), '--load-extension=' + str(root)]}}}
Path('.playwright-cli/browser.json').write_text(json.dumps(config))
PY
trap 'playwright-cli -s=tabswitch-check close' EXIT
playwright-cli -s=tabswitch-check open --persistent --config=.playwright-cli/browser.json chrome://extensions/shortcuts
playwright-cli -s=tabswitch-check run-code 'async page => {
  const context = page.context();
  const sw = context.serviceWorkers()[0] || await context.waitForEvent("serviceworker");
  const commands = await sw.evaluate(() => chrome.commands.getAll());
  for (const [name, key] of [["close-current", "Alt+W"], ["new-tab", "Alt+T"], ["toggle-last", "Alt+A"], ["open-switcher", "Alt+Q"]]) {
    if (commands.find(c => c.name === name)?.shortcut !== key) throw new Error(`Missing shortcut: ${name} ${key}`);
  }
  return commands;
}'
playwright-cli -s=tabswitch-check screenshot --filename=.playwright-cli/shortcuts.png
playwright-cli -s=tabswitch-check console
