const path = require('path');
const { app, BrowserWindow } = require('electron');

const BASE_WIDTH = 1366;
const BASE_HEIGHT = 900;
const MIN_ZOOM_FACTOR = 0.8;
const MAX_ZOOM_FACTOR = 1.4;

function getAdaptiveZoomFactor(win) {
  const [width, height] = win.getContentSize();
  const widthRatio = width / BASE_WIDTH;
  const heightRatio = height / BASE_HEIGHT;
  const rawFactor = Math.min(widthRatio, heightRatio);
  return Math.max(MIN_ZOOM_FACTOR, Math.min(MAX_ZOOM_FACTOR, rawFactor));
}

function applyAdaptiveZoom(win) {
  const zoomFactor = getAdaptiveZoomFactor(win);
  win.webContents.setZoomFactor(zoomFactor);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'app-icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  win.loadFile(indexPath);

  win.webContents.on('did-finish-load', () => {
    applyAdaptiveZoom(win);
  });

  win.on('resize', () => {
    applyAdaptiveZoom(win);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
