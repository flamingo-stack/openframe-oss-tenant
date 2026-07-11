'use client';

import { useOptionalNotifications } from '@flamingo-stack/openframe-frontend-core';
import {
  Board,
  type BoardChange,
  type BoardColumnDef,
  type BoardTicket,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { Filter02Icon, TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button, PageError, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { EmptyState } from '@/app/components/shared';
import { appendImageHash } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { useApprovalRequests } from '../hooks/use-approval-requests';
import { useMoveTicket, useMovingTicketIds } from '../hooks/use-move-ticket';
import { useTicketStatusTransitionRules } from '../hooks/use-ticket-status-transition-rules';
import { emphasizeNewTicketAction, useTicketsActions } from '../hooks/use-tickets-actions';
import type { TicketsPage } from '../services/ticket-service.types';
import { useTicketStatusesQuery } from '../statuses/hooks/use-ticket-statuses-query';
import { mapDefinitionToSystem, usesCanonicalStatusStyle } from '../statuses/types/ticket-statuses.types';
import type { Dialog } from '../types/dialog.types';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';
import { AssigneeFilter } from './assignee-filter';
import { BoardAssigneePicker } from './board-assignee-picker';
import { BoardColumnSubscriber, type BoardColumnUpdate } from './board-column-subscriber';
import { OrganizationFilter } from './organization-filter';
import { TicketTagFilter } from './ticket-label-filter';
import { TicketsFilterModal } from './tickets-filter-modal';

// TODO(unread-from-entity): re-enable per-ticket unread highlighting once the backend exposes
// unread counts on the ticket entity itself. Matching unread notifications to tickets by id is a
// temporary workaround — disabled for now; flip this flag to restore it.
const HIGHLIGHT_UNREAD_FROM_NOTIFICATIONS: boolean = false;

interface TicketsBoardProps {
  selector?: ReactNode;
  organizationIds?: string[];
  onOrganizationIdsChange?: (ids: string[]) => void;
  assigneeIds?: string[];
  onAssigneeIdsChange?: (ids: string[]) => void;
  labelIds?: string[];
  onLabelIdsChange?: (ids: string[]) => void;
  /** Applies organization+assignee filters atomically (mobile filter modal). */
  onFiltersChange?: (filters: { organizationIds: string[]; assigneeIds: string[] }) => void;
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
    pendingApproval: dialog.pendingApproval,
  };
}

export function TicketsBoard({
  selector,
  organizationIds,
  onOrganizationIdsChange,
  assigneeIds,
  onAssigneeIdsChange,
  labelIds,
  onLabelIdsChange,
  onFiltersChange,
  search,
  onSearchChange,
}: TicketsBoardProps) {
  const debouncedSearch = useDebounce(search, 300);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const { data: statusesData, isLoading: statusesLoading, error: statusesError } = useTicketStatusesQuery();
  const { data: transitionRules } = useTicketStatusTransitionRules();
  const { mutate: moveTicket } = useMoveTicket();
  const movingIds = useMovingTicketIds();
  const notifications = useOptionalNotifications();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleApproveRequest, handleRejectRequest } = useApprovalRequests();

  const handleApprovalAction = useCallback(
    async (ticketId: string, requestId: string | undefined, approve: boolean) => {
      if (!requestId) return;
      try {
        if (approve) await handleApproveRequest(requestId);
        else await handleRejectRequest(requestId);
        toast({
          title: approve ? 'Request approved' : 'Request rejected',
          description: approve ? 'The pending request has been approved.' : 'The pending request has been rejected.',
          variant: 'success',
        });
        queryClient.setQueriesData<InfiniteData<TicketsPage>>({ queryKey: dialogsQueryKeys.boardColumns() }, prev => {
          if (!prev?.pages.some(p => p.dialogs.some(d => d.id === ticketId && d.pendingApproval))) return prev;
          return {
            ...prev,
            pages: prev.pages.map(page => ({
              ...page,
              dialogs: page.dialogs.map(d => (d.id === ticketId ? { ...d, pendingApproval: undefined } : d)),
            })),
          };
        });
        queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.detail(ticketId) });
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to update approval request',
          variant: 'destructive',
        });
      }
    },
    [handleApproveRequest, handleRejectRequest, toast, queryClient],
  );

  // Tickets have no unread field of their own; unread state comes from notifications (a separate
  // entity) matched by ticket id.
  const ticketIdsWithUnread = useMemo(() => {
    const ids = new Set<string>();
    if (!HIGHLIGHT_UNREAD_FROM_NOTIFICATIONS) return ids;
    for (const notification of notifications?.notifications ?? []) {
      if (notification.read) continue;
      const ticketId = notification.meta?.ticketId;
      if (typeof ticketId === 'string') ids.add(ticketId);
    }
    return ids;
  }, [notifications?.notifications]);
  const [columnUpdates, setColumnUpdates] = useState<Record<string, BoardColumnUpdate>>({});

  const statuses = useMemo(() => (statusesData?.snapshot ?? []).filter(s => s.kind !== 'ARCHIVED'), [statusesData]);

  const archiveFilter = useMemo(
    () => ({ organizationIds, assigneeIds, labelIds }),
    [organizationIds, assigneeIds, labelIds],
  );
  const filteredResolvedTotal = useMemo(() => {
    const resolvedId = statuses.find(s => s.kind === 'RESOLVED')?.id;
    return resolvedId ? columnUpdates[resolvedId]?.state.total : undefined;
  }, [statuses, columnUpdates]);
  const {
    actions: baseActions,
    menuActions,
    dialog: ticketsActionsDialog,
    canArchiveResolved,
    openArchiveResolvedConfirm,
  } = useTicketsActions({
    isLoading: statusesLoading,
    filter: archiveFilter,
    resolvedCountOverride: filteredResolvedTotal,
  });

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
          allowedFromColumns: transitionRules ? (allowedFromByStatusId[status.id] ?? []) : undefined,
          archivable: status.kind === 'RESOLVED' && canArchiveResolved,
        };
      }),
    [
      statuses,
      columnUpdates,
      transitionRules,
      allowedFromByStatusId,
      isLoading,
      canArchiveResolved,
      ticketIdsWithUnread,
    ],
  );

  const getTicketHref = useCallback((id: string) => routes.tickets.dialog(id), []);

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

  const actions = useMemo(() => emphasizeNewTicketAction(baseActions, showEmptyState), [baseActions, showEmptyState]);

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
            <TicketTagFilter
              search={search}
              onSearchChange={onSearchChange}
              labelIds={labelIds ?? []}
              onLabelIdsChange={ids => onLabelIdsChange?.(ids)}
              filterButton={
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileFiltersOpen(true)}
                  aria-label="Open filters"
                  leftIcon={<Filter02Icon />}
                />
              }
            />
          </div>
          {/* Mobile keeps these filters in the modal next to the search input. */}
          <div className="hidden md:grid grid-cols-4 gap-[var(--spacing-system-l)]">
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

        <TicketsFilterModal
          isOpen={mobileFiltersOpen}
          onClose={() => setMobileFiltersOpen(false)}
          organizationIds={organizationIds ?? []}
          assigneeIds={assigneeIds ?? []}
          onApply={filters => onFiltersChange?.(filters)}
        />

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
              onApprove={(ticketId, requestId) => handleApprovalAction(ticketId, requestId, true)}
              onReject={(ticketId, requestId) => handleApprovalAction(ticketId, requestId, false)}
              collapseStorageKey="tickets-board"
              className="h-full px-[var(--spacing-system-l)]"
            />
          </div>
        )}
      </PageLayout>
      {ticketsActionsDialog}
    </>
  );
}
