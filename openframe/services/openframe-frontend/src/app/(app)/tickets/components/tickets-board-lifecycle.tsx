'use client';

import { useOptionalNotifications } from '@flamingo-stack/openframe-frontend-core';
import {
  Board,
  type BoardChange,
  type BoardColumnDef,
  type BoardTicket,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageError, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/app/components/shared';
import { appendImageHash } from '@/lib/image-url';
import { useMoveTicketLifecycle, useMovingTicketIdsLifecycle } from '../hooks/use-move-ticket-lifecycle';
import { useTicketStatusTransitionRules } from '../hooks/use-ticket-status-transition-rules';
import { useTicketsActions } from '../hooks/use-tickets-actions';
import { useTicketStatusesQuery } from '../statuses/hooks/use-ticket-statuses-query';
import { mapDefinitionToSystem, usesCanonicalStatusStyle } from '../statuses/types/ticket-statuses.types';
import type { Dialog } from '../types/dialog.types';
import { AssigneeFilter } from './assignee-filter';
import { BoardAssigneePicker } from './board-assignee-picker';
import { BoardColumnSubscriber, type BoardColumnUpdate } from './board-column-subscriber';
import { OrganizationFilter } from './organization-filter';
import { TicketLabelSearchInput, TicketLabelsRow } from './ticket-label-filter';

interface TicketsBoardLifecycleProps {
  selector?: ReactNode;
  organizationIds?: string[];
  onOrganizationIdsChange?: (ids: string[]) => void;
  assigneeIds?: string[];
  onAssigneeIdsChange?: (ids: string[]) => void;
  labelIds?: string[];
  onLabelIdsChange?: (ids: string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function initialsOf(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || undefined;
}

function dialogToBoardTicket(dialog: Dialog, hasNewMessage = false): BoardTicket {
  return {
    id: dialog.id,
    title: dialog.title,
    ticketNumber: dialog.ticketNumber !== undefined ? String(dialog.ticketNumber) : '',
    status: dialog.statusName ?? dialog.status,
    deviceHostnames: dialog.deviceHostname ? [dialog.deviceHostname] : undefined,
    organizationName: dialog.organizationName,
    assignees: dialog.assignedTo
      ? [
          {
            id: dialog.assignedTo,
            name: dialog.assignedName,
            initials: initialsOf(dialog.assignedName),
            avatarUrl: appendImageHash(dialog.assigneeImageUrl, dialog.assigneeImageHash),
          },
        ]
      : undefined,
    tags: dialog.labels?.map(l => l.key),
    createdAt: dialog.createdAt,
    hasNewMessage,
  };
}

export function TicketsBoardLifecycle({
  selector,
  organizationIds,
  onOrganizationIdsChange,
  assigneeIds,
  onAssigneeIdsChange,
  labelIds,
  onLabelIdsChange,
  search,
  onSearchChange,
}: TicketsBoardLifecycleProps) {
  const debouncedSearch = useDebounce(search, 300);

  const { data: statusesData, isLoading: statusesLoading, error: statusesError } = useTicketStatusesQuery();
  const { data: transitionRules } = useTicketStatusTransitionRules();
  const { mutate: moveTicket } = useMoveTicketLifecycle();
  const movingIds = useMovingTicketIdsLifecycle();
  const notifications = useOptionalNotifications();

  // Tickets have no unread field of their own; unread state comes from notifications (a separate
  // entity) matched by ticket id.
  const ticketIdsWithUnread = useMemo(() => {
    const ids = new Set<string>();
    for (const notification of notifications?.notifications ?? []) {
      if (notification.read) continue;
      const ticketId = notification.meta?.ticketId;
      if (typeof ticketId === 'string') ids.add(ticketId);
    }
    return ids;
  }, [notifications?.notifications]);
  const {
    actions,
    menuActions,
    dialog: ticketsActionsDialog,
    canArchiveResolved,
    openArchiveResolvedConfirm,
  } = useTicketsActions({ isLoading: statusesLoading });

  const [columnUpdates, setColumnUpdates] = useState<Record<string, BoardColumnUpdate>>({});
  const loadMoreRef = useRef<Record<string, () => void>>({});

  const onUpdate = useCallback((statusId: string, update: BoardColumnUpdate) => {
    setColumnUpdates(prev => ({ ...prev, [statusId]: update }));
  }, []);

  const registerLoadMore = useCallback((statusId: string, loadMore: () => void) => {
    loadMoreRef.current[statusId] = loadMore;
  }, []);

  const params = useMemo(
    () => ({ search: debouncedSearch, organizationIds, assigneeIds, labelIds }),
    [debouncedSearch, organizationIds, assigneeIds, labelIds],
  );

  const statuses = useMemo(() => (statusesData?.snapshot ?? []).filter(s => s.kind !== 'ARCHIVED'), [statusesData]);

  const allowedFromByStatusId = useMemo<Record<string, string[]>>(() => {
    if (!transitionRules) return {};
    const map: Record<string, string[]> = {};
    for (const { from, to } of transitionRules) {
      for (const target of to) {
        (map[target] ??= []).push(from);
      }
    }
    return map;
  }, [transitionRules]);

  const isLoading = statusesLoading || statuses.some(s => columnUpdates[s.id]?.isLoading ?? true);
  const columnError = statuses.map(s => columnUpdates[s.id]?.error).find(Boolean) ?? null;

  const boardColumns = useMemo<BoardColumnDef[]>(
    () =>
      statuses.map(status => {
        const state = columnUpdates[status.id]?.state;
        // AI_ASSISTANCE/RESOLVED style their header from the canonical status key
        // (icon/variant). TECH_REQUIRED and custom statuses render from the backend
        // `color`. `id` stays the statusId regardless.
        const useCanonicalStyle = usesCanonicalStatusStyle(status.kind);
        return {
          id: status.id,
          statusKey: useCanonicalStyle ? mapDefinitionToSystem(status).statusKey : undefined,
          label: status.name,
          color: status.color,
          tickets: (state?.tickets ?? []).map(ticket =>
            dialogToBoardTicket(ticket, ticketIdsWithUnread.has(ticket.id)),
          ),
          total: state?.total,
          hasMore: state?.hasMore,
          isLoading,
          isLoadingMore: state?.isLoadingMore,
          system: status.isSystem,
          allowedFromColumns: allowedFromByStatusId[status.id],
          archivable: status.kind === 'RESOLVED' && canArchiveResolved,
        };
      }),
    [statuses, columnUpdates, allowedFromByStatusId, isLoading, canArchiveResolved, ticketIdsWithUnread],
  );

  const getTicketHref = useCallback((id: string) => `/tickets/dialog?id=${id}`, []);

  const loadMore = useCallback((columnId: string) => {
    loadMoreRef.current[columnId]?.();
  }, []);

  const handleChange = useCallback(
    (change: BoardChange) => {
      moveTicket({
        ticketId: change.ticketId,
        sourceStatusId: change.fromColumnId,
        targetStatusId: change.toColumnId,
        afterTicketId: change.afterTicketId,
        beforeTicketId: change.beforeTicketId,
      });
    },
    [moveTicket],
  );

  const showEmptyState =
    !isLoading &&
    !debouncedSearch &&
    (organizationIds?.length ?? 0) === 0 &&
    (assigneeIds?.length ?? 0) === 0 &&
    (labelIds?.length ?? 0) === 0 &&
    boardColumns.length > 0 &&
    boardColumns.every(column => column.tickets.length === 0);

  if (statusesError) {
    return <PageError message={statusesError.message} />;
  }
  if (columnError) {
    return <PageError message={columnError.message} />;
  }

  return (
    <>
      {statuses.map(status => (
        <BoardColumnSubscriber
          key={status.id}
          statusId={status.id}
          params={params}
          onUpdate={onUpdate}
          registerLoadMore={registerLoadMore}
        />
      ))}

      <PageLayout
        title="Tickets"
        actions={actions.length > 0 ? actions : undefined}
        menuActions={menuActions.length > 0 ? menuActions : undefined}
        actionsVariant="menu-primary"
        selector={selector}
        className="h-full px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
        contentClassName="flex flex-col min-h-0"
      >
        <div className="flex flex-col gap-[var(--spacing-system-l)]">
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <TicketLabelSearchInput
              search={search}
              onSearchChange={onSearchChange}
              labelIds={labelIds ?? []}
              onLabelIdsChange={ids => onLabelIdsChange?.(ids)}
            />
            <TicketLabelsRow selectedIds={labelIds ?? []} onAdd={id => onLabelIdsChange?.([...(labelIds ?? []), id])} />
          </div>
          <div className="grid grid-cols-4 gap-[var(--spacing-system-l)]">
            <OrganizationFilter
              value={organizationIds ?? []}
              onChange={ids => onOrganizationIdsChange?.(ids)}
              className="col-span-1"
            />
            <AssigneeFilter
              value={assigneeIds ?? []}
              onChange={ids => onAssigneeIdsChange?.(ids)}
              className="col-span-1"
            />
          </div>
        </div>

        {showEmptyState ? (
          <EmptyState
            icon={<TagIcon />}
            title="Ticket history empty"
            description="Tickets will appear here when available"
          />
        ) : (
          <div aria-busy={isLoading || movingIds.size > 0} className="flex-1 min-h-0 -mx-[var(--spacing-system-l)]">
            <Board
              columns={boardColumns}
              onChange={handleChange}
              onLoadMore={loadMore}
              onArchiveColumn={openArchiveResolvedConfirm}
              getTicketHref={getTicketHref}
              renderAssignSlot={ticket => <BoardAssigneePicker ticket={ticket} />}
              collapseStorageKey="tickets-board-lifecycle"
              className="h-full px-[var(--spacing-system-l)]"
            />
          </div>
        )}
      </PageLayout>
      {ticketsActionsDialog}
    </>
  );
}
