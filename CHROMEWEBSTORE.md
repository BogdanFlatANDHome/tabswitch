# Chrome Web Store Listing — Tab Switch

_Last updated: 2026-10-06 · Version 1.3.0_

## Store Listing

- **Name:** Tab Switch
- **Category:** Productivity → Tools
- **Language:** English (Russian localization included)
- **Short description (manifest, ≤132):** Alt+Q: every tab in one centered list, numbered and grouped by window, with instant search. Alt+W: previous tab.
- **Single purpose:** Switch between open browser tabs from a keyboard-driven list.

**Detailed description**

Tab Switch shows all your open tabs in one list in the middle of the page when you press Alt+Q.

• Tabs are numbered exactly like your tab strip; the current tab is first and highlighted.
• Tabs from other windows are grouped under the window they belong to.
• Start typing to filter by title or address; press Enter to jump — even to a tab in another window.
• Hold Alt and press Q repeatedly to move down the list, release Alt to switch — like Alt+Tab.
• Alt+W jumps to the previous tab and back.
• Delete closes the highlighted tab without leaving the list.
• Follows Chrome's light or dark appearance automatically.
• The list keeps the same size on every site, regardless of page zoom.
• Works offline, collects nothing.

Shortcuts can be changed at chrome://extensions/shortcuts.

## Graphics & Assets

| Asset | File | Size |
|---|---|---|
| Icon | icons/icon-128.png | 128×128 |
| Screenshot 1 (dark) | store/screenshot-dark.png | 1280×800 |
| Screenshot 2 (light) | store/screenshot-light.png | 1280×800 |
| Small promo tile | — (optional) | 440×280 |

## Permissions Justification

| Permission | Why |
|---|---|
| `tabs` | Read the titles and addresses of open tabs to list them, and switch to or close the tab the user picks. |
| `scripting` | Show the switcher list on tabs that were already open before the extension was installed. |
| `storage` | Keep the list for the small fallback window shown on Chrome's own pages (New Tab, settings), for the current session only. |
| `favicon` | Show each site's icon next to its tab in the list. |
| host `<all_urls>` | The list is drawn on top of whatever page the user is on when they press Alt+Q. It must appear on any site instantly; it never reads or changes page content. `activeTab` alone was not reliable for repeated keyboard use. |

## Privacy & Data Use

### Data Collection

None. No personally identifiable information, health, financial, authentication, personal communications,
location, web history, user activity or website content is collected or transmitted.

### Data Use Certification

- Not sold to third parties.
- Not used for purposes unrelated to the single purpose.
- Not used for creditworthiness or lending.

## Privacy Policy

URL: https://github.com/BogdanFlatANDHome/tabswitch/blob/main/PRIVACY.md

## Distribution

- Visibility: Public
- Regions: All
- Price: Free

## Developer Info

- Publisher: BogdanFlatANDHome
- Homepage / support: https://github.com/BogdanFlatANDHome/tabswitch

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.3.0 | 2026-10-06 | First public release: switcher list, window groups, search, Alt+W, light/dark theme, en/ru. |

## Review Notes

- Test: open several tabs, press Alt+Q on any website.
- On chrome:// pages and the New Tab page the list opens as a small separate window (extensions can't draw there).

### Known Issues / Limitations

- Chrome's custom color themes are not mirrored — only light/dark appearance.

### Rejection History

None yet.
