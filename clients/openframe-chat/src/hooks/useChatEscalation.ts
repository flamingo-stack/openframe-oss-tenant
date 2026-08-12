import type { ChatApprovalStatus } from '@flamingo-stack/openframe-frontend-core';
import { useCallback, useRef, useState } from 'react';
import { ticketGraphQlService } from '../services/ticketGraphQlService';

const NO_LINKED_TICKET_ERROR = 'No ticket is linked to this conversation yet.';

interface UseChatEscalationOptions {
  /** Ticket the open dialog belongs to; escalation is ticket-keyed. */
  ticketId: string | null;
  /** Fired after an approve resolves, so the host can flip ticket state optimistically. */
  onEscalated?: () => void;
}

/**
 * Ticket-escalation offers — the client half of the handoff to a human.
 *
 * Mirrors `useChatApprovals`, but deliberately separate: offers resolve
 * through the ticket-escalation GraphQL mutations rather than the REST
 * approval endpoint, and their terminal states include `cancelled`
 * (the wire's SUPERSEDED — the client typed over a pending offer).
 */
export function useChatEscalation({ ticketId, onEscalated }: UseChatEscalationOptions) {
  // Persisted offer states, fed to `processHistoricalMessages` so a card that
  // lives in a resumed-dialog bubble reflects a resolution seen live.
  const [escalationOfferStates, setEscalationOfferStates] = useState<Record<string, ChatApprovalStatus>>({});

  const ticketIdRef = useRef<string | null>(ticketId);
  ticketIdRef.current = ticketId;

  const applyOfferState = useCallback((offerId: string, status: ChatApprovalStatus) => {
    setEscalationOfferStates(prev => (prev[offerId] === status ? prev : { ...prev, [offerId]: status }));
  }, []);

  const requestEscalation = useCallback(async (): Promise<void> => {
    const id = ticketIdRef.current;
    if (!id) throw new Error(NO_LINKED_TICKET_ERROR);
    await ticketGraphQlService.requestTicketEscalation(id);
  }, []);

  /**
   * Optimistic flip BEFORE the mutation, same reason as command approvals: the
   * card must resolve on the click, not a round-trip later. Both guards run
   * first so a card can never read "Approved" for a request that was never
   * sent, and a failure rolls the flip back and rethrows — the caller owns how
   * to surface it.
   */
  const resolveOffer = useCallback(
    async (offerId: string | undefined, approve: boolean): Promise<void> => {
      if (!offerId) return;
      const id = ticketIdRef.current;
      if (!id) throw new Error(NO_LINKED_TICKET_ERROR);

      applyOfferState(offerId, approve ? 'approved' : 'rejected');

      try {
        if (approve) {
          await ticketGraphQlService.approveTicketEscalation(id);
        } else {
          await ticketGraphQlService.declineTicketEscalation(id);
        }
      } catch (error) {
        applyOfferState(offerId, 'pending');
        throw error;
      }

      // AFTER the handoff is real: this drives the host's optimistic ticket
      // state, and a failure above must not leave the composer locked.
      if (approve) onEscalated?.();
    },
    [applyOfferState, onEscalated],
  );

  const clearEscalation = useCallback(() => {
    setEscalationOfferStates({});
  }, []);

  return {
    escalationOfferStates,
    requestEscalation,
    resolveOffer,
    applyOfferState,
    clearEscalation,
  };
}
