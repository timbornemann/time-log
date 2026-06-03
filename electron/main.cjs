const { app, BrowserWindow, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const resolveWindowIcon = () => {
  const iconsDir = path.join(__dirname, '..', 'build', 'icons');
  const windowsIcon = path.join(iconsDir, 'icon.ico');
  const pngIcon = path.join(iconsDir, 'icon.png');
  const fallbackLogo = path.join(__dirname, '..', 'logo.png');

  if (process.platform === 'win32' && fs.existsSync(windowsIcon)) {
    return windowsIcon;
  }

  if (fs.existsSync(pngIcon)) {
    return pngIcon;
  }

  return fallbackLogo;
};

const createMainWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#FDFBF7',
    title: 'Logbook',
    icon: resolveWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
  mainWindow.removeMenu();

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
