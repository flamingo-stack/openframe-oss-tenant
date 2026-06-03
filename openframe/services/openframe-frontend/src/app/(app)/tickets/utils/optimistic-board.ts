import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';
import type { BoardStatus, TicketsPage } from '../services/ticket-service.types';
import type { Dialog } from '../types/dialog.types';
import { dialogsQueryKeys, ticketsQueryKeys } from './query-keys';

export interface OptimisticMoveInput {
  ticketId: string;
  sourceStatus: BoardStatus;
  targetStatus: BoardStatus;
  afterTicketId: string | null;
  beforeTicketId: string | null;
}

type BoardQueryKey = readonly [string, string, BoardStatus, Record<string, unknown>];

export interface OptimisticMoveSnapshot {
  entries: Array<readonly [QueryKey, InfiniteData<TicketsPage> | undefined]>;
  detail?: { key: QueryKey; data: Dialog | null | undefined };
}

function isBoardQueryKey(key: QueryKey): key is BoardQueryKey {
  return Array.isArray(key) && key.length >= 4 && key[0] === 'dialogs' && key[1] === 'boardColumn';
}

function findDialogInCache(
  entries: ReadonlyArray<readonly [QueryKey, InfiniteData<TicketsPage> | undefined]>,
  ticketId: string,
): Dialog | undefined {
  for (const [, data] of entries) {
    if (!data) continue;
    for (const page of data.pages) {
      const found = page.dialogs.find(d => d.id === ticketId);
      if (found) return found;
    }
  }
  return undefined;
}

function removeFromColumn(data: InfiniteData<TicketsPage>, ticketId: string): InfiniteData<TicketsPage> {
  let removed = false;
  const pages = data.pages.map(page => {
    if (removed) return page;
    const idx = page.dialogs.findIndex(d => d.id === ticketId);
    if (idx < 0) return page;
    removed = true;
    const dialogs = [...page.dialogs.slice(0, idx), ...page.dialogs.slice(idx + 1)];
    return { ...page, dialogs, filteredCount: Math.max(0, page.filteredCount - 1) };
  });
  if (!removed) return data;
  return { ...data, pages };
}

function insertIntoColumn(
  data: InfiniteData<TicketsPage>,
  dialog: Dialog,
  afterTicketId: string | null,
  beforeTicketId: string | null,
): InfiniteData<TicketsPage> {
  if (data.pages.length === 0) {
    return data;
  }

  let inserted = false;
  const pages = data.pages.map(page => {
    if (inserted) return page;

    let insertIndex = -1;
    if (afterTicketId) {
      const idx = page.dialogs.findIndex(d => d.id === afterTicketId);
      if (idx >= 0) insertIndex = idx + 1;
    }
    if (insertIndex < 0 && beforeTicketId) {
      const idx = page.dialogs.findIndex(d => d.id === beforeTicketId);
      if (idx >= 0) insertIndex = idx;
    }

    if (insertIndex < 0) return page;

    inserted = true;
    const dialogs = [...page.dialogs.slice(0, insertIndex), dialog, ...page.dialogs.slice(insertIndex)];
    return { ...page, dialogs, filteredCount: page.filteredCount + 1 };
  });

  if (inserted) return { ...data, pages };

  const [firstPage, ...rest] = pages;
  return {
    ...data,
    pages: [
      { ...firstPage, dialogs: [dialog, ...firstPage.dialogs], filteredCount: firstPage.filteredCount + 1 },
      ...rest,
    ],
  };
}

export function applyOptimisticMove(queryClient: QueryClient, input: OptimisticMoveInput): OptimisticMoveSnapshot {
  const entries = queryClient.getQueriesData<InfiniteData<TicketsPage>>({
    queryKey: dialogsQueryKeys.boardColumns(),
  });

  const detailKey = ticketsQueryKeys.detail(input.ticketId);
  const detailData = queryClient.getQueryData<Dialog | null>(detailKey);

  const snapshot: OptimisticMoveSnapshot = {
    entries: entries.map(([key, data]) => [key, data] as const),
    detail: { key: detailKey, data: detailData },
  };

  const movedDialog = findDialogInCache(entries, input.ticketId) ?? detailData ?? undefined;
  if (!movedDialog) return snapshot;

  const updatedDialog: Dialog = { ...movedDialog, status: input.targetStatus };
  const isSameColumn = input.sourceStatus === input.targetStatus;

  if (detailData) {
    queryClient.setQueryData<Dialog | null>(detailKey, { ...detailData, status: input.targetStatus });
  }

  for (const [key, data] of entries) {
    if (!data || !isBoardQueryKey(key)) continue;
    const statusInKey = key[2];

    if (isSameColumn) {
      if (statusInKey !== input.sourceStatus) continue;
      const without = removeFromColumn(data, input.ticketId);
      const next = insertIntoColumn(without, updatedDialog, input.afterTicketId, input.beforeTicketId);
      queryClient.setQueryData(key, next);
      continue;
    }

    if (statusInKey === input.sourceStatus) {
      queryClient.setQueryData(key, removeFromColumn(data, input.ticketId));
    } else if (statusInKey === input.targetStatus) {
      queryClient.setQueryData(key, insertIntoColumn(data, updatedDialog, input.afterTicketId, input.beforeTicketId));
    }
  }

  return snapshot;
}

export function rollbackOptimisticMove(queryClient: QueryClient, snapshot: OptimisticMoveSnapshot): void {
  for (const [key, data] of snapshot.entries) {
    queryClient.setQueryData(key, data);
  }
  if (snapshot.detail) {
    queryClient.setQueryData(snapshot.detail.key, snapshot.detail.data);
  }
}
