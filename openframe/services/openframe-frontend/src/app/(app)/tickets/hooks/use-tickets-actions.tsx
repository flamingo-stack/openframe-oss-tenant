'use client';

import { BoxArchiveIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import type {
  ActionsMenuGroup,
  ActionsMenuItem,
  PageActionButton,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useArchiveResolvedMutation } from './use-archive-resolved-mutation';
import { useTicketStatistics } from './use-ticket-statistics';

interface UseTicketsActionsParams {
  isLoading: boolean;
  enabled?: boolean;
}

export function useTicketsActions({ isLoading, enabled = true }: UseTicketsActionsParams) {
  const router = useRouter();
  const archiveResolvedMutation = useArchiveResolvedMutation();
  const { resolvedCount } = useTicketStatistics({ enabled });

  const handleNewTicket = useCallback(() => {
    router.push('/tickets/new');
  }, [router]);

  const handleArchiveResolved = useCallback(async () => {
    await archiveResolvedMutation.mutateAsync();
  }, [archiveResolvedMutation]);

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
    const items: ActionsMenuItem[] = [
      {
        id: 'tickets-archive',
        label: 'Tickets Archive',
        icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
        href: '/tickets/archive',
      },
    ];
    if (resolvedCount > 0) {
      items.push({
        id: 'archive-resolved',
        label: 'Archive Resolved',
        icon: <BoxArchiveIcon className="text-ods-text-secondary" />,
        onClick: handleArchiveResolved,
        disabled: archiveResolvedMutation.isPending || isLoading,
      });
    }
    return [{ items }];
  }, [enabled, resolvedCount, handleArchiveResolved, archiveResolvedMutation.isPending, isLoading]);

  return { actions, menuActions };
}
