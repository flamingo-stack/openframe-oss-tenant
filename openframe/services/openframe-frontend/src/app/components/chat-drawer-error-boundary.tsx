'use client';

import { Component, type ReactNode } from 'react';

/**
 * Last-resort guard for the Mingo drawer: the embedded chat surfaces fetch
 * through the core lib's `embedAuthedFetch`, which throws synchronously on
 * URLs it refuses (e.g. any `/content/*` path resolved against the native
 * shell's capacitor:// origin). Without a boundary such a throw unmounts the
 * whole app shell; with it, only the drawer panel degrades.
 */
export class ChatDrawerErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ChatDrawerErrorBoundary] chat drawer crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-ods-text-secondary">Mingo is unavailable right now. Close the panel and try again.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
