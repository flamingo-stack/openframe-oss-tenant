import { focusManager } from '@tanstack/react-query';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useEffect } from 'react';
import { log } from '../utils/log';

// The webview's document.visibilityState is unreliable when the Tauri window is
// hidden to tray / blurred, so react-query never pauses refetchInterval. Drive
// focusManager from native window-visibility events emitted by the Rust shell
// instead, so background clients stop polling the gateway.
export function useWindowFocusManager(): void {
  useEffect(() => {
    focusManager.setEventListener(handleFocus => {
      const win = getCurrentWindow();
      const unlistenPromise = win.listen<boolean>('window-visibility', event => {
        handleFocus(event.payload);
      });

      win
        .isVisible()
        .then(visible => handleFocus(visible))
        .catch(error => log.error('focus-manager', 'failed to read window visibility', String(error)));

      return () => {
        unlistenPromise.then(unlisten => unlisten());
      };
    });
  }, []);
}
