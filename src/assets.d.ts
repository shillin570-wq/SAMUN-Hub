declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';

interface DesktopWindowState {
  isFullScreen: boolean;
  isResizable: boolean;
}

interface DesktopWindowApi {
  getState: () => Promise<DesktopWindowState>;
  setFullScreen: (enabled: boolean) => Promise<DesktopWindowState>;
  onFullScreenChanged: (callback: (isFullScreen: boolean) => void) => () => void;
}

interface Window {
  desktopWindow?: DesktopWindowApi;
}
