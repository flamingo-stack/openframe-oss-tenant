'use client';

import { NotFoundError } from '@flamingo-stack/openframe-frontend-core';
import { Component, type ReactNode } from 'react';

/**
 * Sentinel thrown by a suspended data leaf when the queried entity does not
 * exist (e.g. `data.script === null`). Caught by {@link NotFoundBoundary}.
 */
export class NotFoundSignal extends Error {
  constructor() {
    super('entity-not-found');
    this.name = 'NotFoundSignal';
  }
}

interface NotFoundBoundaryProps {
  message: string;
  children: ReactNode;
}

interface NotFoundBoundaryState {
  error: unknown;
}

/**
 * Error boundary that swaps the whole page — including chrome rendered ABOVE
 * the Suspense boundary — for a full-page `NotFoundError` when a data leaf
 * throws {@link NotFoundSignal}. This keeps the "lift the page chrome out of
 * Suspense" pattern honest: a missing entity must not leave live actions
 * (Run/Edit) pointing at nothing.
 *
 * Any other error (e.g. a Relay network error thrown by `useLazyLoadQuery`)
 * is rethrown to the app-level boundary, exactly as without this wrapper.
 */
export class NotFoundBoundary extends Component<NotFoundBoundaryProps, NotFoundBoundaryState> {
  state: NotFoundBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): NotFoundBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.state.error instanceof NotFoundSignal) {
        return <NotFoundError message={this.props.message} />;
      }
      throw this.state.error;
    }
    return this.props.children;
  }
}
