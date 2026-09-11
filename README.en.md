# dsh-history

DSH web plugin: **quickly view, search, and jump to all the messages *you* sent** in a long conversation.

[中文](README.md) | English

## Features

- **Full history** — lists **every** message you sent in the current session, including pages not yet loaded into the conversation window and history shadowed by compaction.
- **One-click jump** — click a message for fully automatic positioning: auto-loads earlier history if the target is not yet loaded, waits for rendering if needed, then smooth-scrolls + flashes the highlight and closes the panel.
- **Sort toggle** — newest-first by default; one click to switch between "newest first / oldest first".
- **Text filter** — live filtering by message text.
- **One-click copy** — a copy button on every row copies the full message text.
- **Fast startup** — the full list is prefetched in the background when you enter a session, so the panel opens instantly; the host side keeps a cache.

## 🚀 Install

**Prerequisite**: DSH installed and working (`dsh web` runs).

```bash
# 1. Install the plugin
dsh plugin --profile web add dsh-history@latest

# 2. Automatically restart the service (the script ships with the plugin — no download needed)
bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh
```

After that, **"我的消息 (N)"** ("My Messages (N)") appears above the input box in every session — no manual action required.

---

## FAQ

<details>
<summary><b>How do I update the plugin?</b></summary>

```bash
dsh plugin --profile web update dsh-history
# or install the latest directly
dsh plugin --profile web add dsh-history@latest
```

Then run `bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh` (or hard-refresh the browser).

</details>

<details>
<summary><b>How do I install directly from GitHub (bypassing npm)?</b></summary>

```bash
dsh plugin --profile web add github:chenproton/dsh-history#main
# or the full URL form
dsh plugin --profile web add https://github.com/chenproton/dsh-history.git#main
```

Then run `bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh` the same way. This channel uses the committed build artifacts directly — no local build needed.

</details>

<details>
<summary><b>How do I install from source / develop?</b></summary>

To debug local changes or follow a dev branch, point the dependency at a local clone and build it yourself:

```bash
# 1. Clone and build
git clone https://github.com/chenproton/dsh-history.git ~/Code/dsh-history
cd ~/Code/dsh-history && pnpm install && pnpm build

# 2. Point the dependency at the local clone
#    Edit dependencies in ~/.dsh/profiles/web/package.json:
#    "dsh-history": "link:<absolute path to the clone>"

# 3. Append the mount row to ~/.dsh/profiles/web/cordis.patch.yml:
#    - insert:
#        - id: dsh-history
#          name: 'dsh-history'

# 4. Install in the profile directory
cd ~/.dsh/profiles/web && pnpm install

# 5. Restart to apply (the script lives in the clone)
bash ~/Code/dsh-history/restart-dsh-web.sh
```

**Updating**: `git pull && pnpm install && pnpm build` → `bash ~/Code/dsh-history/restart-dsh-web.sh`.

**Switching back to the npm channel**: change the dependency back to `"dsh-history": "^0.1.25"`, run `pnpm install`, and remove the manual mount row (to avoid double-mounting).

**Maintainer docs**: the release & multi-platform listing runbook (npm / GitHub / awesome-dsh-plugin / dsh-market) lives in [`docs/publishing.md`](docs/publishing.md).

</details>

<details>
<summary><b>How do I install via plugin-registry?</b></summary>

> Prerequisite: DSH with plugin-registry integrated (the `dsh registry` command exists). Enabling both channels at once double-mounts (two Node halves, two panels).

```bash
git clone https://github.com/chenproton/dsh-history.git && cd dsh-history
pnpm install && pnpm build
node scripts/package-registry.mjs      # assemble registry/ staging (manifest + artifacts + README, not committed)
dsh registry install ./registry        # install (disabled by default)
dsh registry enable dsh-external/dsh-history
bash restart-dsh-web.sh                # automatically restart to apply
```

**Updating**: `git pull && pnpm install && pnpm build` → `node scripts/package-registry.mjs` → `dsh registry uninstall/install/enable` → `bash restart-dsh-web.sh`. Remove the other channel's mount before switching.

</details>

<details>
<summary><b>What is restart-dsh-web.sh? "No such file or directory"?</b></summary>

It is a **one-click restart script** shipped with the plugin: it detects the deployment method and restarts DSH Web so the plugin takes effect —

- managed by **systemd** (`dsh-web.service`) → runs `systemctl restart` (clean, single instance);
- otherwise finds the running `dsh web` process and restarts it with its original arguments (nohup);
- starts fresh with `dsh web` if no process is found.

`No such file or directory` means the script is not in your current shell directory — use the full path, or copy it first:

```bash
# Use the script inside the installed package directly (full path, works from any directory)
bash ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh

# Or copy it to your current directory
cp ~/.dsh/profiles/web/node_modules/dsh-history/restart-dsh-web.sh ~/restart-dsh-web.sh
bash ~/restart-dsh-web.sh

# Or download from the repo when the package is not installed
curl -O https://raw.githubusercontent.com/chenproton/dsh-history/main/restart-dsh-web.sh
bash restart-dsh-web.sh
```

Options: `-n` previews the commands to run (dry-run), `-p PID` targets a specific process, `-l FILE` sets the log file.

</details>

<details>
<summary><b>What about the "✕ missing peer" warnings during install?</b></summary>

Safe to ignore. DSH provides `@deepseek-ai/*` and react at runtime through its own module table — no need to reinstall them in the profile (official plugins show the same warnings).

</details>

<details>
<summary><b>I don't see "我的消息" after install</b></summary>

1. Make sure you restarted the service (`restart-dsh-web.sh`) or hard-refreshed the browser (Cmd/Ctrl+Shift+R);
2. Check the plugin is in the bundle: `dsh.profile.bundles` in `~/.dsh/profiles/web/package.json` should contain `dsh-history`;
3. Still stuck? Report the output of `dsh plugin --profile web list` in an issue.

</details>

---

## Usage

1. Click **"我的消息 (N)"** ("My Messages (N)") above the input box (N = total messages you've sent in the current session).
2. The panel expands: search box + sort toggle + message list (timestamp + text preview + status tag).
3. Status tags:
   - **可定位 / Locatable** (green) = already in the loaded window → click auto-scrolls + highlights.
   - **未加载 / Not loaded** (grey) = in earlier history → click auto-loads earlier history and locates it.
   - **定位中… / Locating…** (yellow) = loading / waiting for render to locate the message.
4. The `⧉` copy button on each row copies the full text (turns into `✓` for 1.4s, then restores).

## Changelog

### v0.1.25

- **DSH 0.1.5 compatibility**: `conversation.input.dock`'s `session` is now a `SessionSnapshot` (no `chat`), and Chat nodes moved behind the standard `useChat` selector hook — fixes the list rendering while message locate/jump silently failed.
- **DSH 0.1.5 compatibility**: the host reads the live log through `session.snapshotEvents()` instead of the removed `session.events` (old getter kept as fallback), restoring the in-memory fast path.

### v0.1.20

- Docs: added this **English README.en.md**, cross-linked with the Chinese README; shipped in the npm package and the registry staging.

### v0.1.19

- Code cleanup: extracted pure helpers into `src/client/util.ts`, slimmed the component file and unified repeated logic — no behavior change (internal refactor).

### v0.1.18

- Fix: clicking a "可定位" (locatable) message no longer relies on async `scrollIntoView`; it now positions the conversation scrollport directly (`getBoundingClientRect`-centered), scrolling synchronously and reliably regardless of panel state.

### v0.1.17

- Fix: the restart script now **auto-cleans stray dsh web processes holding the port** (identifies processes whose cmdline matches `dsh web` and stops them), then verifies with an HTTP health check; non-dsh processes are never mis-killed.

### v0.1.16

- Fix: restart script upgrade — port-conflict diagnostics and an HTTP health check (no longer trusts `is-active`, which reports active the instant the process forks but can still crash right after).

### v0.1.15

- Fix: the restart script polls for service activation for up to 30s (instead of a fixed 3s, for slow cold starts) and dumps `systemctl status` + journal logs on failure.

### v0.1.14

- Docs: install section simplified to the recommended npm path; GitHub / source / registry / script / peer-warning topics all moved into a collapsible FAQ.

### v0.1.11

- Added the **`restart-dsh-web.sh`** companion script: one-command service restart after install/update. Auto-detects the deployment (systemd service / bare process restart / fresh start), with `-n` dry-run, `-p PID`, `-l LOG`.

### v0.1.9

- Install options expanded: **GitHub direct install**, **source-link install**, and **plugin-registry** channels (with `scripts/package-registry.mjs` and a registry-specific client bundle).

### v0.1.7

- UX: clicking a message now **auto-locates fully** — loads earlier history when the node isn't loaded; waits for rendering (up to 1.5s retries) when the node is loaded but not yet in the DOM, then scrolls + highlights + closes. Rows show "定位中… / Locating…" during the process; only genuine failures surface a notice.

### v0.1.5

- Performance/stability: full history now **reads the session's in-memory log first** (no persistence read, no replay validation), falling back to the full log read only for inactive sessions — greatly reducing "请求超时 / request timeout" occurrences.
- Timeout raised to 15s for very large sessions.
- UX: notices moved to the top of the panel with a highlighted background, always visible.

### v0.1.3

- Stability: 15s fetch timeout with a "重试 / Retry" button on failure.
- Stability: auto-load paging capped at 30 pages to prevent pathological loops.
- Performance: bounded caches on both client and host sides.
- UX: copy feedback restores after 1.4s; same-day messages show time only (`HH:mm`).
- UX: huge histories render only the latest 200 rows with a hint; `Esc` closes the panel; keyboard-accessible rows (Enter/Space) and aria-labels.

### v0.1.1

- Performance: prefetch the full message list in the background on session entry — panel opens instantly.
- Host-side 5s per-session cache.

### v0.1.0

- First release: full-history listing, one-click jump + highlight, auto-load earlier history, newest/oldest sort toggle, text search, one-click copy.

## License

MIT
