'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useEffect, useState } from 'react';
import { authApiClient, SAAS_DOMAIN_SUFFIX } from '@/lib/auth-api-client';

export type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Debounced check of whether an email is already registered. Runs only on valid email format. */
export function useEmailAvailability(email: string, delay = 400): AvailabilityStatus {
  const debounced = useDebounce(email.trim(), delay);
  const [status, setStatus] = useState<AvailabilityStatus>('idle');

  useEffect(() => {
    if (!debounced || !EMAIL_REGEX.test(debounced)) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    authApiClient
      .checkEmailAvailability(debounced)
      .then(res => {
        if (cancelled) return;
        if (!res.ok || !res.data) {
          setStatus('error');
          return;
        }
        const { available } = res.data as { available?: boolean };
        setStatus(available ? 'available' : 'taken');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return status;
}

/** Debounced check of subdomain availability; returns status plus suggested alternatives when taken. */
export function useDomainAvailability(
  subdomain: string,
  orgName: string,
  enabled: boolean,
  delay = 400,
): { status: AvailabilityStatus; suggestions: string[] } {
  const debounced = useDebounce(subdomain.trim(), delay);
  // Debounced too — otherwise every keystroke in Organization Name re-fires the check.
  const debouncedOrgName = useDebounce(orgName.trim(), delay);
  const [status, setStatus] = useState<AvailabilityStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled || !debounced) {
      setStatus('idle');
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setStatus('checking');
    setSuggestions([]);

    authApiClient
      .checkDomainAvailability(debounced, debouncedOrgName)
      .then(res => {
        if (cancelled) return;
        if (!res.ok || !res.data) {
          setStatus('error');
          return;
        }
        const { available, suggestedUrl } = res.data as { available: boolean; suggestedUrl?: string[] };
        if (available) {
          setStatus('available');
          setSuggestions([]);
        } else {
          setStatus('taken');
          setSuggestions((suggestedUrl ?? []).map(url => url.replace(`.${SAAS_DOMAIN_SUFFIX}`, '')));
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [debounced, debouncedOrgName, enabled]);

  return { status, suggestions };
}
