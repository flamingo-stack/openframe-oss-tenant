'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  type AutocompleteOption,
  type AvatarOption,
  customerOptionFromTicket,
  type TicketSearchOption,
  useOrganizationOptions,
  useTicketSearchOptions,
} from '@/app/(app)/tickets/hooks/use-ticket-options';

export interface TicketCustomerSeed {
  ticketId?: string | null;
  ticketLabel?: string | null;
  customerId?: string | null;
  customerLabel?: string | null;
  customerImageUrl?: string | null;
  /** Lock the customer field, e.g. when it was derived from a pre-selected ticket. */
  lockCustomer?: boolean;
  /**
   * Pin the customer to a fixed context (e.g. a customer-scoped page). Like `lockCustomer` it
   * disables the field, but it is never auto-cleared when the ticket is cleared.
   */
  fixedCustomer?: boolean;
}

/** Keep a selected option visible even when it isn't in the current search page. */
function withSeed<T extends AutocompleteOption>(options: T[], seed: T | null): T[] {
  if (!seed || options.some(option => option.value === seed.value)) return options;
  return [seed, ...options];
}

/**
 * Owns the linked ticket + customer selection shared by the time-tracker panel and the
 * manual-entry modal. Rules:
 * - Customer selected first → tickets are filtered to that customer; changing the customer
 *   drops a now-mismatched ticket.
 * - Ticket selected → the customer is pinned to the ticket's organization and locked (even
 *   when the customer was picked first); clearing the ticket releases the derived customer.
 */
export function useTicketCustomerSelection() {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLocked, setCustomerLocked] = useState(false);
  const [customerFixed, setCustomerFixed] = useState(false);
  const [ticketSearch, setTicketSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [ticketSeed, setTicketSeed] = useState<TicketSearchOption | null>(null);
  const [customerSeed, setCustomerSeed] = useState<AvatarOption | null>(null);

  const { options: ticketOptionsRaw, isLoading: ticketsLoading } = useTicketSearchOptions(
    ticketSearch,
    customerId ?? undefined,
  );
  const { options: customerOptionsRaw, isLoading: customersLoading } = useOrganizationOptions(customerSearch);

  const ticketOptions = useMemo(() => withSeed(ticketOptionsRaw, ticketSeed), [ticketOptionsRaw, ticketSeed]);
  const customerOptions = useMemo(() => withSeed(customerOptionsRaw, customerSeed), [customerOptionsRaw, customerSeed]);

  const selectTicket = useCallback(
    (id: string | null) => {
      setTicketId(id);
      if (!id) {
        setTicketSeed(null);
        if (customerLocked && !customerFixed) {
          setCustomerId(null);
          setCustomerSeed(null);
          setCustomerLocked(false);
        }
        return;
      }
      const option = ticketOptions.find(candidate => candidate.value === id) ?? null;
      setTicketSeed(option);
      if (customerFixed) return;
      if (option?.organizationId) {
        setCustomerId(option.organizationId);
        setCustomerSeed(customerOptionFromTicket(option));
        setCustomerLocked(true);
      } else if (!customerId || customerLocked) {
        setCustomerId(null);
        setCustomerSeed(null);
        setCustomerLocked(false);
      }
    },
    [ticketOptions, customerId, customerLocked, customerFixed],
  );

  const selectCustomer = useCallback(
    (id: string | null) => {
      setCustomerId(id);
      setCustomerSeed(customerOptions.find(candidate => candidate.value === id) ?? null);
      setCustomerLocked(false);
      // Customer-first: re-scope tickets, dropping a ticket that may not belong to the new customer.
      if (id && id !== customerId) {
        setTicketId(null);
        setTicketSeed(null);
      }
    },
    [customerOptions, customerId],
  );

  const reset = useCallback((seed?: TicketCustomerSeed) => {
    setTicketSearch('');
    setCustomerSearch('');
    setTicketId(seed?.ticketId ?? null);
    setTicketSeed(
      seed?.ticketId
        ? {
            value: seed.ticketId,
            label: seed.ticketLabel ?? seed.ticketId,
            organizationId: seed.customerId ?? null,
            organizationName: seed.customerLabel ?? null,
            organizationImageUrl: seed.customerImageUrl ?? null,
          }
        : null,
    );
    setCustomerId(seed?.customerId ?? null);
    setCustomerSeed(
      seed?.customerId
        ? {
            value: seed.customerId,
            label: seed.customerLabel ?? seed.customerId,
            imageUrl: seed.customerImageUrl ?? undefined,
          }
        : null,
    );
    setCustomerFixed(!!seed?.fixedCustomer);
    setCustomerLocked(!!seed?.lockCustomer || !!seed?.fixedCustomer);
  }, []);

  return {
    ticketId,
    customerId,
    customerLocked,
    ticketOptions,
    customerOptions,
    ticketsLoading,
    customersLoading,
    setTicketSearch,
    setCustomerSearch,
    selectTicket,
    selectCustomer,
    reset,
  };
}
