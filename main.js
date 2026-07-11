const { app, BrowserWindow, BrowserView, ipcMain } = require('electron');
const path = require('path');

const SIDEBAR_WIDTH = 380;

let mainWindow;
let browserView;
let stopRequested = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'AI Auto Tasker Desktop',
    backgroundColor: '#0b0b0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);

  browserView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:ytauto' // keeps login session saved across app restarts
    }
  });

  mainWindow.setBrowserView(browserView);
  layoutBrowserView();
  browserView.webContents.loadURL('https://www.youtube.com');

  browserView.webContents.on('did-navigate', sendUrlUpdate);
  browserView.webContents.on('did-navigate-in-page', sendUrlUpdate);

  mainWindow.on('resize', layoutBrowserView);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function sendUrlUpdate() {
  if (mainWindow && browserView) {
    mainWindow.webContents.send('url-update', browserView.webContents.getURL());
  }
}

function layoutBrowserView() {
  if (!mainWindow || !browserView) return;
  const [width, height] = mainWindow.getContentSize();
  browserView.setBounds({
    x: SIDEBAR_WIDTH,
    y: 0,
    width: Math.max(width - SIDEBAR_WIDTH, 100),
    height
  });
  browserView.setAutoResize({ width: true, height: true });
}

// ---------- Script command tokenizer ----------
// Supports: command "quoted arg" bareword 123
function tokenize(line) {
  const tokens = [];
  const regex = /"([^"]*)"|(\S+)/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    tokens.push(match[1] !== undefined ? match[1] : match[2]);
  }
  return tokens;
}

function esc(str) {
  return JSON.stringify(str || '');
}

// ---------- JS snippets injected into the embedded page ----------
function jsClickBySelector(selector) {
  return `
    (function() {
      const el = document.querySelector(${esc(selector)});
      if (el) { el.scrollIntoView({block:'center'}); el.click(); return true; }
      return false;
    })();
  `;
}

function jsClickByText(text) {
  return `
    (function() {
      const target = ${esc(text)}.toLowerCase();
      const candidates = Array.from(document.querySelectorAll('button, a, tp-yt-paper-button, yt-button-shape, ytd-button-renderer'));
      for (const el of candidates) {
        const label = (el.innerText || el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (label && label.includes(target)) {
          el.scrollIntoView({block:'center'});
          el.click();
          return true;
        }
      }
      return false;
    })();
  `;
}

function jsTypeInto(selector, text) {
  return `
    (function() {
      const el = document.querySelector(${esc(selector)});
      if (!el) return false;
      el.focus();
      if ('value' in el) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, ${esc(text)});
        el.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        el.innerText = ${esc(text)};
      }
      return true;
    })();
  `;
}

function jsClickFirstChannelResult() {
  return `
    (function() {
      const link = document.querySelector(
        'ytd-channel-renderer a#main-link, ytd-channel-renderer a#photo, ytd-channel-renderer yt-formatted-string#text, a.yt-simple-endpoint.channel-link'
      );
      if (link) { link.scrollIntoView({block:'center'}); link.click(); return true; }
      // fallback: click the whole renderer if the inner link wasn't found
      const renderer = document.querySelector('ytd-channel-renderer');
      if (renderer) { renderer.scrollIntoView({block:'center'}); renderer.click(); return true; }
      return false;
    })();
  `;
}

function jsFindVideo(titleFragment) {
  return `
    (function() {
      const frag = ${esc(titleFragment)}.toLowerCase();
      const items = Array.from(document.querySelectorAll('a#video-title, #video-title'));
      for (const el of items) {
        const t = (el.getAttribute('title') || el.innerText || '').toLowerCase();
        if (t.includes(frag)) { el.scrollIntoView({block:'center'}); el.click(); return true; }
      }
      if (items.length > 0) { items[0].click(); return true; }
      return false;
    })();
  `;
}

function jsClickVideosTab() {
  return `
    (function() {
      const tabs = Array.from(document.querySelectorAll('yt-tab-shape, tp-yt-paper-tab'));
      for (const tab of tabs) {
        const label = (tab.innerText || tab.getAttribute('aria-label') || '').trim().toLowerCase();
        if (label === 'videos') { tab.click(); return true; }
      }
      return false;
    })();
  `;
}

function jsClickFirstChannelVideo() {
  return `
    (function() {
      const link = document.querySelector(
        'ytd-rich-item-renderer a#video-title-link, ytd-grid-video-renderer a#video-title, a#video-title-link'
      );
      if (link) { link.scrollIntoView({block:'center'}); link.click(); return true; }
      return false;
    })();
  `;
}

function jsClickChannelVideoByTitle(titleFragment) {
  return `
    (function() {
      const frag = ${esc(titleFragment)}.toLowerCase();
      const links = Array.from(document.querySelectorAll(
        'ytd-rich-item-renderer a#video-title-link, ytd-grid-video-renderer a#video-title, a#video-title-link'
      ));
      if (frag) {
        for (const el of links) {
          const t = (el.getAttribute('title') || el.innerText || '').toLowerCase();
          if (t.includes(frag)) { el.scrollIntoView({block:'center'}); el.click(); return true; }
        }
      }
      if (links.length > 0) { links[0].scrollIntoView({block:'center'}); links[0].click(); return true; }
      return false;
    })();
  `;
}

function jsSubscribeCollaboratorsPanel() {
  return `
    (async function() {
      const moreLink = Array.from(document.querySelectorAll('a, span, tp-yt-paper-button, yt-formatted-string, button'))
        .find(el => /and\\s+\\d+\\s+more/i.test((el.innerText || '').trim()));
      if (!moreLink) return { opened: false, subscribed: 0 };
      moreLink.scrollIntoView({block:'center'});
      moreLink.click();
      await new Promise(r => setTimeout(r, 900));

      const heading = Array.from(document.querySelectorAll('*')).find(
        el => (el.innerText || '').trim() === 'Collaborators' && el.children.length === 0
      );
      let scope = document;
      if (heading) {
        let p = heading;
        for (let i = 0; i < 6 && p; i++) {
          p = p.parentElement;
          if (p && p.querySelectorAll('button').length > 1) { scope = p; break; }
        }
      }

      const buttons = Array.from(scope.querySelectorAll('button')).filter(
        b => (b.innerText || '').trim().toLowerCase() === 'subscribe'
      );

      let count = 0;
      for (const b of buttons) {
        b.scrollIntoView({block:'center'});
        b.click();
        count++;
        await new Promise(r => setTimeout(r, 600));
      }
      return { opened: true, subscribed: count };
    })();
  `;
}

function jsSubscribe() {
  return `
    (function() {
      const btns = Array.from(document.querySelectorAll('button, tp-yt-paper-button, yt-button-shape button'));
      for (const el of btns) {
        const label = (el.innerText || el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (label === 'subscribe' || label.startsWith('subscribe')) {
          el.click();
          return true;
        }
      }
      return false;
    })();
  `;
}

function jsClickBell() {
  return `
    (function() {
      // Only look inside the channel header / subscribe area - NEVER the top masthead bell
      const scopes = [
        'ytd-subscribe-button-renderer',
        '#subscribe-button',
        '#inner-header-container',
        'ytd-channel-name'
      ];
      for (const scopeSel of scopes) {
        const scope = document.querySelector(scopeSel);
        if (!scope) continue;
        const bell = scope.querySelector(
          'button[aria-label*="Notification" i], #notification-preference-button button'
        ) || scope.parentElement?.querySelector(
          'button[aria-label*="Notification" i], #notification-preference-button button'
        );
        if (bell) { bell.scrollIntoView({block:'center'}); bell.click(); return true; }
      }
      return false;
    })();
  `;
}

function jsSelectAllNotifications() {
  return `
    (function() {
      const items = Array.from(document.querySelectorAll('tp-yt-paper-item, yt-list-item-view-model'));
      for (const el of items) {
        const t = (el.innerText || '').trim().toLowerCase();
        if (t === 'all') { el.click(); return true; }
      }
      return false;
    })();
  `;
}

function jsScroll(amount) {
  return `window.scrollBy(0, ${Number(amount) || 500});`;
}

async function runInView(code) {
  try {
    return await browserView.webContents.executeJavaScript(code, true);
  } catch (e) {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(win, message, kind = 'info') {
  if (win && !win.isDestroyed()) {
    win.webContents.send('script-log', { message, kind });
  }
}

ipcMain.handle('run-script', async (event, scriptText) => {
  stopRequested = false;
  const lines = scriptText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  log(mainWindow, `Starting script (${lines.length} commands)`, 'info');

  for (let i = 0; i < lines.length; i++) {
    if (stopRequested) {
      log(mainWindow, 'Script stopped by user.', 'warn');
      break;
    }
    const line = lines[i];
    const tokens = tokenize(line);
    const cmd = (tokens[0] || '').toLowerCase();
    log(mainWindow, `> ${line}`, 'command');

    try {
      switch (cmd) {
        case 'open_url':
          await browserView.webContents.loadURL(tokens[1]);
          await wait(1500);
          break;
        case 'goto_home':
          await browserView.webContents.loadURL('https://www.youtube.com');
          await wait(1500);
          break;
        case 'wait':
          await wait(parseInt(tokens[1], 10) || 1000);
          break;
        case 'search_channel': {
          const query = encodeURIComponent(tokens[1] || '');
          // sp=EgIQAg%3D%3D is YouTube's official "Channel" results filter
          await browserView.webContents.loadURL(
            `https://www.youtube.com/results?search_query=${query}&sp=EgIQAg%253D%253D`
          );
          await wait(1800);
          const ok2 = await runInView(jsClickFirstChannelResult());
          log(mainWindow, ok2 ? 'Channel opened.' : 'Could not find channel result.', ok2 ? 'success' : 'warn');
          await wait(1500);
          break;
        }
        case 'subscribe_channel_video': {
          const name = tokens[1] || '';
          const videoTitle = tokens[2] || '';
          log(mainWindow, `--- ${name} : "${videoTitle}" ---`, 'info');

          const query = encodeURIComponent(name);
          await browserView.webContents.loadURL(
            `https://www.youtube.com/results?search_query=${query}&sp=EgIQAg%253D%253D`
          );
          await wait(1800);
          const foundChannel = await runInView(jsClickFirstChannelResult());
          log(mainWindow, foundChannel ? 'Channel opened.' : 'Channel not found, skipping.', foundChannel ? 'success' : 'warn');
          if (!foundChannel) break;
          await wait(1800);

          await runInView(jsClickVideosTab());
          await wait(1200);
          const foundVideo = await runInView(jsClickChannelVideoByTitle(videoTitle));
          log(mainWindow, foundVideo ? 'Video opened.' : 'No matching video found.', foundVideo ? 'success' : 'warn');
          await wait(2000);

          const subscribed = await runInView(jsSubscribe());
          log(mainWindow, subscribed ? 'Subscribed.' : 'Subscribe button not found.', subscribed ? 'success' : 'warn');
          await wait(1000);

          const bellOpened = await runInView(jsClickBell());
          await wait(700);
          const bellAll = await runInView(jsSelectAllNotifications());
          log(mainWindow, bellOpened ? 'Bell menu opened.' : 'Bell icon not found.', bellOpened ? 'success' : 'warn');
          if (bellAll) log(mainWindow, 'Notifications set to All.', 'success');
          await wait(800);
          break;
        }
        case 'subscribe_channel': {
          const name = tokens[1] || '';
          log(mainWindow, `--- ${name} ---`, 'info');

          const query = encodeURIComponent(name);
          await browserView.webContents.loadURL(
            `https://www.youtube.com/results?search_query=${query}&sp=EgIQAg%253D%253D`
          );
          await wait(1800);
          const foundChannel = await runInView(jsClickFirstChannelResult());
          log(mainWindow, foundChannel ? 'Channel opened.' : 'Channel not found, skipping.', foundChannel ? 'success' : 'warn');
          if (!foundChannel) break;
          await wait(1800);

          await runInView(jsClickVideosTab());
          await wait(1200);
          const foundVideo = await runInView(jsClickFirstChannelVideo());
          log(mainWindow, foundVideo ? 'Video opened.' : 'No video found on channel.', foundVideo ? 'success' : 'warn');
          await wait(2000);

          const subscribed = await runInView(jsSubscribe());
          log(mainWindow, subscribed ? 'Subscribed.' : 'Subscribe button not found.', subscribed ? 'success' : 'warn');
          await wait(1000);

          const bellOpened = await runInView(jsClickBell());
          await wait(700);
          const bellAll = await runInView(jsSelectAllNotifications());
          log(mainWindow, bellOpened ? 'Bell menu opened.' : 'Bell icon not found.', bellOpened ? 'success' : 'warn');
          if (bellAll) log(mainWindow, 'Notifications set to All.', 'success');
          await wait(800);
          break;
        }
        case 'subscribe_collaborators': {
          const result = await runInView(jsSubscribeCollaboratorsPanel());
          if (result && result.opened) {
            log(mainWindow, `Collaborators panel opened, subscribed to ${result.subscribed} channel(s).`, result.subscribed > 0 ? 'success' : 'warn');
          } else {
            log(mainWindow, 'No "and X more" collaborators panel found on this video.', 'warn');
          }
          await wait(800);
          break;
        }
        case 'find_video': {
          const ok = await runInView(jsFindVideo(tokens[1]));
          log(mainWindow, ok ? 'Video opened.' : 'Video not found.', ok ? 'success' : 'warn');
          await wait(1500);
          break;
        }
        case 'subscribe': {
          const ok = await runInView(jsSubscribe());
          log(mainWindow, ok ? 'Subscribe clicked.' : 'Subscribe button not found.', ok ? 'success' : 'warn');
          await wait(800);
          break;
        }
        case 'click_bell': {
          const ok = await runInView(jsClickBell());
          await wait(700);
          const ok2 = await runInView(jsSelectAllNotifications());
          log(mainWindow, ok ? 'Bell menu opened.' : 'Bell icon not found.', ok ? 'success' : 'warn');
          if (ok2) log(mainWindow, 'Notification set to All.', 'success');
          break;
        }
        case 'click':
          await runInView(jsClickBySelector(tokens[1]));
          break;
        case 'click_text':
          await runInView(jsClickByText(tokens[1]));
          break;
        case 'type':
          await runInView(jsTypeInto(tokens[1], tokens[2]));
          break;
        case 'scroll':
          await runInView(jsScroll(tokens[1]));
          break;
        case 'log':
          log(mainWindow, tokens[1] || '', 'info');
          break;
        default:
          log(mainWindow, `Unknown command: ${cmd}`, 'warn');
      }
    } catch (err) {
      log(mainWindow, `Error on "${line}": ${err.message}`, 'error');
    }
  }

  log(mainWindow, 'Script finished.', 'info');
  return true;
});

ipcMain.handle('stop-script', async () => {
  stopRequested = true;
  return true;
});

ipcMain.handle('nav', async (event, action) => {
  if (!browserView) return;
  if (action === 'back' && browserView.webContents.canGoBack()) browserView.webContents.goBack();
  if (action === 'forward' && browserView.webContents.canGoForward()) browserView.webContents.goForward();
  if (action === 'reload') browserView.webContents.reload();
  if (action === 'home') browserView.webContents.loadURL('https://www.youtube.com');
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
