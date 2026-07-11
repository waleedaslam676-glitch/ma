const scriptInput = document.getElementById('script-input');
const logConsole = document.getElementById('log-console');
const urlPill = document.getElementById('url-pill');

document.getElementById('btn-run').addEventListener('click', () => {
  logConsole.innerHTML = '';
  window.api.runScript(scriptInput.value);
});

document.getElementById('btn-stop').addEventListener('click', () => {
  window.api.stopScript();
});

document.getElementById('btn-back').addEventListener('click', () => window.api.nav('back'));
document.getElementById('btn-forward').addEventListener('click', () => window.api.nav('forward'));
document.getElementById('btn-reload').addEventListener('click', () => window.api.nav('reload'));
document.getElementById('btn-home').addEventListener('click', () => window.api.nav('home'));

window.api.onLog(({ message, kind }) => {
  const line = document.createElement('div');
  line.className = `log-line log-${kind || 'info'}`;
  line.textContent = message;
  logConsole.appendChild(line);
  logConsole.scrollTop = logConsole.scrollHeight;
});

window.api.onUrlUpdate((url) => {
  try {
    const u = new URL(url);
    urlPill.textContent = u.hostname + u.pathname;
  } catch (e) {
    urlPill.textContent = url;
  }
});
