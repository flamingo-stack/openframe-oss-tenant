'use client';

import type { Dialog } from '../types/dialog.types';

export const BOARD_PAGE_SIZE = 20;

export interface BoardColumnState {
  tickets: Dialog[];
  total: number;
  endCursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}
