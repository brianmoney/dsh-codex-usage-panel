# dsh-codex-usage-panel

A Codex quota card pinned at the bottom of the left sidebar in the DeepSeek
Harness Web UI — styled like the Command Code panel that sits beside it — plus a
full quota dashboard the card opens.

It is its own plugin and **reads the quota from
[`dsh-codex-subscription`](https://github.com/WSL043/dsh-codex-subscription)**, the
Codex plugin. Nothing here talks to ChatGPT directly.

```
(◔) Codex                        [1 resets]
5h      resets 3:40 PM                  47%
[▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░]
Weekly  resets Mon 9:00 AM              82%
[▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░]
```

| Surface | Slot | What it shows |
| --- | --- | --- |
| Sidebar card | `sidebar.footer.action` (order 2 — below the Cordis and Command Code entries) | Quota ring, "Codex", a status badge, then one row per quota window (5 h, weekly) with reset time, remaining percentage and a full-width bar |
| Rail button | same entry, `wide: false` | The 36 px icon button with the ring, for the collapsed sidebar |
| Dashboard | `main`, key `codex-usage-panel` | Every rate-limit window reported, credits / spend-limit / reset-credit tiles, a freshness line, Refresh and Close |

Clicking the card opens the dashboard; Close returns to the conversation.

## Requirements

- DeepSeek Harness with the Web UI (`dsh web`, or the Desktop app).
- The **[`dsh-codex-subscription`](https://github.com/WSL043/dsh-codex-subscription)**
  plugin, signed in to a ChatGPT account. That plugin owns the OAuth credential and
  the usage cache; this panel only displays what it reports.

Without the Codex plugin the card simply renders nothing — an absent dependency is
an installation problem, not a quota state, so the sidebar foot stays clean.

## Install

```sh
dsh plugin --profile <your-profile> add github:brianmoney/dsh-codex-usage-panel
```

Then restart the host profile (or, in Desktop, restart the app). Alternatively
install the package directory through the app's plugin manager.

## Why it reads the Codex plugin instead of the API

The Codex plugin owns the OAuth credential, the `/wham/usage` cache and the quota
projection. A second reader here would need its own credential path and could
disagree with the Codex panel next to it. So this panel is a pure consumer of that
plugin's report over the same authenticated bridge its own composer readout uses:

```
POST /api/codex-subscription/status  ->  { authenticated, provider, expiresAt? }
POST /api/codex-subscription/usage   ->  { rateLimits: [{ id, name?, windows: [
                                            { usedPercent, remainingPercent,
                                              windowSeconds, resetsAt? }] }],
                                            chatPass?, credits?, individualLimit?,
                                            spendControlReached?, resetCredits? }
```

Two units to remember: a window's `resetsAt` is epoch **seconds**, while
`credits.expiresAt` and `resetCredits.nextExpiresAt` are **milliseconds**.

## Behaviour

- `status` is asked first, exactly like the Codex composer readout, so an
  unauthenticated account never masquerades as a usage error and a missing route
  never masquerades as "signed out".
- Polls once at boot, every 60 s while the window is visible, immediately on return
  to the foreground, and every 5 s (max 6 tries) while the bridge looks absent. A
  hidden window makes no requests. The Codex host caches usage for 60 s, so a poll is
  normally free; **Refresh** on the dashboard passes `force: true`.
- A transport error keeps the last readings and marks them stale; it only reports
  "unavailable" when nothing has ever been read.
- Remaining, not consumed: the Codex plugin's own vocabulary and its settings page
  both read that way, so the ring and the bars fill as quota *remains* and turn to
  `--dsw-alias-state-error-primary` at or below 20 %.

## Styling and locale

Only `--dsw-alias-*` theme tokens are used, so light and dark themes follow the
host. No Harness client package is imported — the buttons, the ring and the bars are
local markup — which keeps the panel working across host releases. English and
Simplified Chinese copy is registered under the `codex-usage-panel` locale
namespace, so it follows the UI language.

## Files

| File | Role |
| --- | --- |
| `package.json` | Bundle + `dsh.client` declaration, dependency, display metadata |
| `cordis.patch.yml` | One insert row; the panel is entirely a browser surface |
| `index.js` | Host half: no services, no work (see its module doc) |
| `client.js` | The whole panel: store, reader, card, dashboard, stylesheet |
| `locale/en.json`, `locale/zh.json` | Plugin-manager title and description |

## License

MIT — see [LICENSE](LICENSE).
