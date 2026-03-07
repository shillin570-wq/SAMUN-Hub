const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopWindow', {
  getState: () => ipcRenderer.invoke('window-control:get-state'),
  setFullScreen: (enabled) => ipcRenderer.invoke('window-control:set-full-screen', Boolean(enabled)),
  onFullScreenChanged: (callback) => {
    const listener = (_, isFullScreen) => callback(Boolean(isFullScreen));
    ipcRenderer.on('window-control:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('window-control:fullscreen-changed', listener);
  },
});
