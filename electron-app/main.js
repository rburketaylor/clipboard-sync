const isNativeHostProcess = process.argv.includes('--native-host');

if (isNativeHostProcess) {
  require('./native-host');
} else {
  const { app, BrowserWindow } = require('electron');
  const path = require('path');

  let mainWindow;
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

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
