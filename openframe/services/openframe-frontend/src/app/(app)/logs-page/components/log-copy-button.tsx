'use client';

import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import { useLogDetails } from '../../log-details/hooks/use-log-details';
import { formatLogDetailsForCopy } from '../utils/format-log-details';

/** Identifying fields needed to fetch a log's full details for copying. */
export interface LogCopyTarget {
  toolEventId: string;
  ingestDay: string;
  toolType: string;
  eventType: string;
  timestamp: string;
}

/**
 * Table-row "Copy Log Details" button. The row payload only carries the summary,
 * so the full log (message + raw details) is fetched on click — the same source
 * the log-details page copies — and then formatted via {@link formatLogDetailsForCopy}.
 */
export function LogCopyButton({ log }: { log: LogCopyTarget }) {
  const { copy, copied } = useCopyToClipboard({
    successDescription: 'Log details copied to clipboard',
    errorDescription: 'Unable to copy log details',
  });
  const { fetchLogDetailsById, isLoading } = useLogDetails();

  const handleCopy = async () => {
    try {
      const details = await fetchLogDetailsById(
        log.toolEventId,
        log.ingestDay,
        log.toolType,
        log.eventType,
        log.timestamp,
      );
      if (details) {
        copy(formatLogDetailsForCopy(details));
      }
    } catch {
      // fetchLogDetailsById already surfaces the failure via a toast.
    }
  };

  return (
    <Button
      onClick={handleCopy}
      disabled={isLoading}
      variant="outline"
      size="icon"
      leftIcon={
        copied ? (
          <CheckIcon className="w-5 h-5 text-[var(--ods-attention-green-success)]" />
        ) : (
          <Copy02Icon className="w-5 h-5" />
        )
      }
      aria-label="Copy log details"
      className="bg-ods-card"
    />
  );
}
