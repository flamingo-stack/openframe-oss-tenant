'use client';

import { TruncateText } from '@flamingo-stack/openframe-frontend-core';
import { OSTypeBadgeGroup } from '@flamingo-stack/openframe-frontend-core/components';
import { ListLoader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLazyLoadQuery, usePaginationFragment } from 'react-relay';
import type { scriptsRunPickerRelay_query$key } from '@/__generated__/scriptsRunPickerRelay_query.graphql';
import type { scriptsRunPickerRelayQuery as ScriptsRunPickerQueryType } from '@/__generated__/scriptsRunPickerRelayQuery.graphql';
import { platformsToIds } from '@/app/(app)/scripts/v2/utils/script-mappers';
import { scriptsRunPickerRelayFragment, scriptsRunPickerRelayQuery } from '@/graphql/scripts/scripts-run-picker-relay';
import { ScriptsTagFilter, ScriptsTagFilterSkeleton } from '../../../scripts/v2/components/scripts-tag-filter';
import { RunScriptSelectListSkeleton } from './run-script-skeletons';

const PICKER_PAGE_SIZE = 20;

interface PickerListProps {
  search: string;
  tagIds: string[];
  onSelect: (scriptId: string) => void;
}

function PickerList({ search, tagIds, onSelect }: PickerListProps) {
  const root = useLazyLoadQuery<ScriptsRunPickerQueryType>(
    scriptsRunPickerRelayQuery,
    { search: search || null, tagIds: tagIds.length > 0 ? tagIds : null, first: PICKER_PAGE_SIZE },
    { fetchPolicy: 'store-and-network' },
  );
  const { data, loadNext, hasNext, isLoadingNext } = usePaginationFragment(
    scriptsRunPickerRelayFragment,
    root as scriptsRunPickerRelay_query$key,
  );
  const scripts = useMemo(
    () => (data.scripts?.edges ?? []).flatMap(e => (e?.node ? [e.node] : [])),
    [data.scripts?.edges],
  );

  // Infinite scroll: load the next page when the bottom sentinel nears the
  // viewport of whichever ancestor scrolls (the modal body). `rootMargin`
  // pre-fetches slightly before it's reached.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNext) return;
    const io = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting && !isLoadingNext) loadNext(PICKER_PAGE_SIZE);
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNext, isLoadingNext, loadNext]);

  if (scripts.length === 0) {
    return (
      <div className="px-[var(--spacing-system-mf)] py-[var(--spacing-system-xl)] text-center text-ods-text-secondary text-h6">
        No scripts found
      </div>
    );
  }

  return (
    <div>
      {scripts.map(script => (
        <button
          key={script.id}
          type="button"
          onClick={() => onSelect(script.id)}
          className="flex w-full items-center gap-[var(--spacing-system-mf)] border-b border-ods-border px-[var(--spacing-system-mf)] py-[var(--spacing-system-sf)] text-left last:border-b-0 hover:bg-ods-bg-hover"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <TruncateText variant="h4">{script.name}</TruncateText>
            {script.description && (
              <TruncateText variant="h6" tone="secondary">
                {script.description}
              </TruncateText>
            )}
          </div>
          <OSTypeBadgeGroup osTypes={platformsToIds(script.supportedPlatforms)} iconSize="w-4 h-4" />
        </button>
      ))}
      {hasNext && <div ref={sentinelRef} className="h-px w-full" />}
      {isLoadingNext && (
        <div className="py-[var(--spacing-system-mf)]">
          <ListLoader />
        </div>
      )}
    </div>
  );
}

interface RunScriptSelectStepProps {
  onSelect: (scriptId: string) => void;
}

/** Step 1 of the run-script modal — search + tag-filtered list of ACTIVE scripts. */
export function RunScriptSelectStep({ onSelect }: RunScriptSelectStepProps) {
  const [searchInput, setSearchInput] = useState('');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const debouncedSearch = useDebounce(searchInput, 300);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
      <Suspense fallback={<ScriptsTagFilterSkeleton search={searchInput} onSearchChange={setSearchInput} />}>
        <ScriptsTagFilter
          search={searchInput}
          onSearchChange={setSearchInput}
          tagIds={tagIds}
          onTagIdsChange={setTagIds}
        />
      </Suspense>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-[6px] border border-ods-border">
        <Suspense fallback={<RunScriptSelectListSkeleton />}>
          <PickerList search={debouncedSearch} tagIds={tagIds} onSelect={onSelect} />
        </Suspense>
      </div>
    </div>
  );
}
