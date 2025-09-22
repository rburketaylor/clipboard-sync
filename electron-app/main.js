const isNativeHostProcess = process.argv.includes('--native-host');

if (isNativeHostProcess) {
  require('./native-host');
} else {
  const { app, BrowserWindow, clipboard, ipcMain } = require('electron');
  const path = require('path');
  const crypto = require('crypto');

  let mainWindow;
  const CLIPBOARD_EVENT = 'clipboard:changed';
  const CLIPBOARD_POLL_MS = 1200;
  let clipboardTimer = null;
  let clipboardWatchers = 0;
  let lastHash = '';
  let lastSelfHash = '';
  let lastSelfTimestamp = 0;

  const hashText = (text = '') => crypto.createHash('sha1').update(text).digest('hex');

  function notifyRenderers(payload) {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(CLIPBOARD_EVENT, payload);
    }
  }

  function sampleClipboard() {
    const text = clipboard.readText();
    return { text, hash: hashText(text), mimeType: 'text/plain' };
  }

  function startClipboardWatcher() {
    if (clipboardTimer) return;
    const { hash } = sampleClipboard();
    lastHash = hash;
    clipboardTimer = setInterval(() => {
      const snapshot = sampleClipboard();
      if (!snapshot.hash && !lastHash) {
        return;
      }
      if (snapshot.hash === lastHash) {
        return;
      }
      if (
        snapshot.hash === lastSelfHash &&
        Date.now() - lastSelfTimestamp < 1500
      ) {
        lastHash = snapshot.hash;
        return;
      }

      lastHash = snapshot.hash;
      notifyRenderers({
        text: snapshot.text,
        mimeType: snapshot.mimeType,
        hash: snapshot.hash,
        timestamp: new Date().toISOString(),
      });
    }, CLIPBOARD_POLL_MS);
  }

  function stopClipboardWatcher() {
    if (clipboardTimer) {
      clearInterval(clipboardTimer);
      clipboardTimer = null;
    }
  }

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 900,
      height: 640,
      title: 'Clipboard Sync',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    const url = new URL(`file://${path.join(__dirname, 'renderer', 'index.html')}`);
    mainWindow.loadURL(url.toString());

    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  }

  app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('clipboard:read', () => sampleClipboard());

    ipcMain.handle('clipboard:write', (_event, { text = '' } = {}) => {
      clipboard.writeText(text);
      lastSelfHash = hashText(text);
      lastSelfTimestamp = Date.now();
      lastHash = lastSelfHash;
      return { ok: true };
    });

    ipcMain.handle('clipboard:watch-start', () => {
      clipboardWatchers += 1;
      startClipboardWatcher();
      const snapshot = sampleClipboard();
      return { ok: true, snapshot };
    });

    ipcMain.handle('clipboard:watch-stop', () => {
      clipboardWatchers = Math.max(clipboardWatchers - 1, 0);
      if (clipboardWatchers === 0) {
        stopClipboardWatcher();
      }
      return { ok: true };
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    stopClipboardWatcher();
    if (process.platform !== 'darwin') app.quit();
  });
}
