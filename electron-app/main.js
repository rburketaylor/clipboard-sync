const { app, BrowserWindow, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

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

function createTray() {
  const iconPath = path.join(__dirname, 'renderer', 'icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { role: 'quit' },
  ]);
  tray.setToolTip('Clipboard Sync');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow?.isVisible()) mainWindow.focus();
    else mainWindow?.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
