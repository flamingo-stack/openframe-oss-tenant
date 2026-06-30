'use client';

import {
  BoxArchiveIcon,
  CheckCircleIcon,
  PenEditIcon,
  PlusCircleIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type {
  ActionsMenuGroup,
  ActionsMenuItem,
  PageActionButton,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { routes } from '@/lib/routes';
import { type ArchiveResolvedFilter, useArchiveResolvedMutation } from './use-archive-resolved-mutation';
import { useTicketStatistics } from './use-ticket-statistics';

interface UseTicketsActionsParams {
  isLoading: boolean;
  enabled?: boolean;
  filter?: ArchiveResolvedFilter;
  resolvedCountOverride?: number;
}

/**
 * Promote the "New Ticket" action to the accent (yellow) variant while the page
 * shows its empty state, so the primary CTA stands out. Re-colors the icon to the
 * on-accent token to match. No-op when `emphasize` is false (keeps the outline).
 */
export function emphasizeNewTicketAction(actions: PageActionButton[], emphasize: boolean): PageActionButton[] {
  if (!emphasize) return actions;
  return actions.map(action =>
    action.label === 'New Ticket'
      ? {
          ...action,
          variant: 'accent',
          icon: <span className="inline-flex [&_svg]:!text-ods-text-on-accent">{action.icon}</span>,
        }
      : action,
  );
}

export function useTicketsActions({
  isLoading,
  enabled = true,
  filter,
  resolvedCountOverride,
}: UseTicketsActionsParams) {
  const router = useRouter();
  const archiveResolvedMutation = useArchiveResolvedMutation();
  const { resolvedCount: globalResolvedCount } = useTicketStatistics({ enabled });
  const resolvedCount = resolvedCountOverride ?? globalResolvedCount;
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const handleNewTicket = useCallback(() => {
    router.push(routes.tickets.new());
  }, [router]);

  const handleArchiveConfirm = useCallback(async () => {
    await archiveResolvedMutation.mutateAsync(filter ?? {});
    setIsArchiveConfirmOpen(false);
  }, [archiveResolvedMutation, filter]);

  const openArchiveResolvedConfirm = useCallback(() => setIsArchiveConfirmOpen(true), []);
  const canArchiveResolved = resolvedCount > 0 && !archiveResolvedMutation.isPending && !isLoading;

  const actions = useMemo<PageActionButton[]>(() => {
    if (!enabled) return [];
    return [
      {
        label: 'New Ticket',
        onClick: handleNewTicket,
        variant: 'outline',
        icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
      },
    ];
  }, [enabled, handleNewTicket]);

  const menuActions = useMemo<ActionsMenuGroup[]>(() => {
    if (!enabled) return [];
    const items: ActionsMenuItem[] = [];
    items.push({
      id: 'edit-statuses',
      label: 'Edit Statuses',
      icon: <PenEditIcon className="text-ods-text-secondary" />,
      href: routes.tickets.statuses,
    });
    items.push({
      id: 'tickets-archive',
      label: 'Tickets Archive',
      icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
      href: routes.tickets.archive,
    });
    if (resolvedCount > 0) {
      items.push({
        id: 'archive-resolved',
        label: 'Archive Resolved Tickets',
        icon: <CheckCircleIcon className="text-ods-text-secondary" />,
        onClick: openArchiveResolvedConfirm,
        disabled: archiveResolvedMutation.isPending || isLoading,
      });
    }
    return [{ items }];
  }, [enabled, resolvedCount, archiveResolvedMutation.isPending, isLoading, openArchiveResolvedConfirm]);

  const dialog: ReactNode = (
    <ConfirmDialog
      open={isArchiveConfirmOpen}
      onOpenChange={open => {
        if (!open) setIsArchiveConfirmOpen(false);
      }}
      title="Archive Resolved Tickets"
      description={
        resolvedCount === 1
          ? 'This will archive 1 resolved ticket. It will be moved to the Tickets Archive but can be restored later.'
          : `This will archive ${resolvedCount} resolved tickets. They will be moved to the Tickets Archive but can be restored later.`
      }
      confirmLabel="Archive Tickets"
      pendingLabel="Archiving..."
      variant="destructive"
      isPending={archiveResolvedMutation.isPending}
      onConfirm={handleArchiveConfirm}
    />
  );

  return { actions, menuActions, dialog, canArchiveResolved, openArchiveResolvedConfirm };
}
