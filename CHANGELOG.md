# Changelog

## 0.1.0 — 2026-11-10

First release.

- Sidebar footer card in `sidebar.footer.action` (order 2, below the Cordis and
  Command Code entries): quota ring, product name, status badge, then one row per
  quota window with reset time, remaining percentage and a full-width bar.
- Collapsed 56px rail renders the same entry as a 36px icon button carrying the ring.
- Quota dashboard in the `main` keyed slot (`codex-usage-panel`): every rate-limit
  window reported, credits / spend-limit / reset-credit tiles, freshness line,
  Refresh and Close.
- Reads quota from `dsh-codex-subscription` over its authenticated bridge
  (`POST /api/codex-subscription/{status,usage}`); no second credential path and no
  direct ChatGPT API access.
- Polls once at boot, every 60s while visible, on return to foreground, and every 5s
  (max 6 tries) while the bridge looks absent. Hidden windows make no requests.
- Renders nothing in the sidebar foot when the Codex plugin is absent, instead of an
  error shell.
- English and Simplified Chinese copy under the `codex-usage-panel` locale namespace.
- Styling uses only `--dsw-alias-*` theme tokens; no Harness client package is imported.
