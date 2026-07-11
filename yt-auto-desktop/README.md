# AI Auto Tasker Desktop

Electron app: embedded Chrome browser (YouTube) + custom scripting language to automate clicks,
channel search, video search, subscribe, and bell notifications — desktop version of the
AI Auto Tasker Android app.

## How it works

- Left sidebar = script editor + console.
- Right side = **real embedded browser** (Chromium `BrowserView`), pinned to youtube.com.
- Login manually once (type your email/password yourself inside the embedded browser like a
  normal browser tab) — the session is saved to disk (`persist:ytauto` partition), so you stay
  logged in on next launch. The app does not read, store, or automate your password.
- Write commands in the script box, hit **Run Script**, and it executes them on the live page.

## Script commands

```
open_url <url>              # navigate to any URL
goto_home                   # go to youtube.com
wait <ms>                   # pause
subscribe_collaborators      # on the currently open video: opens the "and X more"
                             # collaborators panel (if present) and clicks Subscribe
                             # on every channel listed inside it. Doesn't set bell -
                             # only individual channel visits do that.
subscribe_channel_video "channel" "video title" # search channel, open it, open the
                             # matching video (title search), play it, subscribe,
                             # bell -> "All". Falls back to first video if title
                             # doesn't match anything.
subscribe_channel "name"    # same as above but always plays the channel's first video
search_channel "name"       # search + open first channel result only
find_video "title fragment" # search results, click matching video
subscribe                   # click Subscribe button
click_bell                  # open bell menu + select "All"
click "css selector"        # raw click by CSS selector
click_text "visible text"   # click first element whose text matches
type "selector" "text"      # type into an input/textarea
scroll <amount>             # scroll page by pixels
log "message"                # print to console panel
# comment
```

Example — subscribe + bell for a list of collaborator channels, each with a specific
video to open first (add as many lines as you want, no rebuild needed):
```
subscribe_channel_video "Channel One" "Their Latest Upload"
subscribe_channel_video "Channel Two" "Tutorial"
subscribe_channel_video "Channel Three" "Vlog"
```

Example:
```
goto_home
search_channel "MrBeast"
wait 1500
subscribe
click_bell
```

## Run locally (optional, needs Node.js)

```
npm install
npm start
```

## Build .exe without a local Android-Studio-grade PC

Since local builds aren't practical on a low-spec machine, this repo ships a GitHub Actions
workflow (`.github/workflows/build.yml`) — same pattern as the Calculator app pipeline:

1. Push this folder to a GitHub repo (root of repo, matching the workflow's working directory).
2. Go to the repo's **Actions** tab → run **Build Windows EXE** (or just push to `main`).
3. Download the `AI-Auto-Tasker-Desktop-EXE` artifact — a portable `.exe`, no installer needed.

## Notes / limits

- YouTube's DOM/class names change over time — if a command like `subscribe` or `click_bell`
  stops working, it usually means YouTube changed a label or button structure; the selectors in
  `main.js` (`jsSubscribe`, `jsClickBell`, etc.) may need a small tweak.
- This automates your own logged-in session only — it doesn't bypass login, captchas, or any
  account security step. Those must be completed manually the first time.
- One embedded browser view at a time in this version. Multi-account / multi-window support can
  be added later (e.g. one `BrowserWindow` + `BrowserView` pair per account) if needed.
