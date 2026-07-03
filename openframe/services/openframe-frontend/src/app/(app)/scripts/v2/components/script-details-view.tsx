'use client';

import { Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  BracketCurlyIcon,
  ClockHistoryIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ActionsMenuGroup,
  Skeleton,
  type TabItem,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense, useMemo } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';
import { decodeGlobalId } from '@/lib/relay-id';
import { routes } from '@/lib/routes';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { initiatorName } from '../utils/execution-helpers';
import { envVarsToStrings, platformsToIds, shellToId } from '../utils/script-mappers';
import { NotFoundBoundary, NotFoundSignal } from './not-found-boundary';
import { ScriptDetailsTab } from './script-details-tab';
import { ScriptExecutionsTab } from './script-executions-tab';
import { ScriptPageChrome } from './script-page-chrome';
import { ScriptSummaryCard, ScriptSummaryCardSkeleton } from './script-summary-card';

// Two tabs only — Schedules is intentionally omitted from the v2 details page.
const DETAIL_TABS: TabItem[] = [
  { id: 'details', label: 'Script Details', icon: BracketCurlyIcon },
  { id: 'executions', label: 'Execution History', icon: ClockHistoryIcon },
];

interface ScriptDetailsViewProps {
  scriptId: string;
}

// ----------------------------------------------------------------
// Header island — tags row + summary card
// ----------------------------------------------------------------

/**
 * Both data islands read the same `scriptDetail` query with identical variables:
 * Relay dedupes identical in-flight requests, so mounting them in one commit
 * still issues a single network call; afterwards both render from the store.
 */
function ScriptHeaderSection({ scriptId }: ScriptDetailsViewProps) {
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );
  const script = data.script;

  // Mingo context carries the RAW db id (the route's `scriptId` is the Relay
  // global id) — matching the picker + the `@script:<id>` marker the backend
  // resolver expects. The mention chip re-encodes it to a global id for fetch.
  const scriptDbId = useMemo(() => decodeGlobalId(scriptId)?.rawId ?? scriptId, [scriptId]);
  useTrackOpenView(
    script ? { type: CONTEXT_ENTITY_KIND.SCRIPT, id: scriptDbId, label: script.name || scriptDbId } : null,
  );

  if (!script) {
    throw new NotFoundSignal();
  }

  const tags = script.tags ?? [];

  return (
    <>
      {tags.length > 0 && (
        <div className="flex flex-wrap items-start gap-[var(--spacing-system-xs)]">
          {tags.map(tag => (
            <Tag key={tag.id} variant="outline" label={tag.key} />
          ))}
        </div>
      )}

      <ScriptSummaryCard
        name={script.name}
        description={script.description}
        shellId={shellToId(script.shell)}
        platforms={platformsToIds(script.supportedPlatforms)}
        timeoutSeconds={script.defaultTimeoutSeconds}
        author={script.author ? initiatorName(script.author) : null}
      />
    </>
  );
}

/** Row of clickable tag chips under the title (mirrors the `Tag` outline chips). */
const TAG_CHIP_WIDTHS = ['w-28', 'w-24', 'w-40', 'w-32'];

function ScriptHeaderSkeleton() {
  return (
    <>
      <div className="flex flex-wrap items-start gap-[var(--spacing-system-xs)]">
        {TAG_CHIP_WIDTHS.map(width => (
          <Skeleton key={width} className={`h-8 ${width} rounded-md`} />
        ))}
      </div>
      <ScriptSummaryCardSkeleton />
    </>
  );
}

// ----------------------------------------------------------------
// "Script Details" tab island — args/env cards + source editor
// ----------------------------------------------------------------

function ScriptDetailsTabSection({ scriptId }: ScriptDetailsViewProps) {
  // `store-or-network` (not `-and-`): the header island (mounted for the whole
  // page visit) already revalidated this exact query on page load. This island
  // remounts on every tab switch — reading the store avoids refetching the whole
  // script each time the user returns to the Details tab.
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-or-network' },
  );
  const script = data.script;

  // Not-found is escalated (full-page) by the header island; render nothing here.
  if (!script) {
    return null;
  }

  return (
    <ScriptDetailsTab
      args={script.defaultArgs ? [...script.defaultArgs] : []}
      envVarStrings={envVarsToStrings(script.envVars)}
      scriptBody={script.scriptBody}
      shellId={shellToId(script.shell)}
    />
  );
}

/** Skeleton for a {@link ScriptArgumentsCard}: caption label + key——value rows. */
function InfoCardSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-xxs)] w-full">
      <Skeleton className="h-5 w-44" />
      <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)] flex flex-col gap-[var(--spacing-system-sf)]">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-[var(--spacing-system-xsf)]">
            <Skeleton className="h-5 w-20" />
            <div className="flex-1 h-px bg-ods-border" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Code editor block skeleton (Syntax label + editor surface). */
function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <Skeleton className="h-5 w-16" />
      <div className="bg-ods-card border border-ods-border rounded-lg p-[var(--spacing-system-mf)] h-[400px] flex flex-col gap-[var(--spacing-system-xsf)]">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${Math.max(20, 80 - i * 5 + ((i * 17) % 30))}%` }} />
        ))}
      </div>
    </div>
  );
}

function ScriptDetailsTabSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-lf)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-system-lf)]">
        <InfoCardSkeleton />
        <InfoCardSkeleton />
      </div>
      <EditorSkeleton />
    </div>
  );
}

// ----------------------------------------------------------------
// Page shell — chrome renders immediately, data islands suspend
// ----------------------------------------------------------------

/**
 * The page chrome (title, Back, Run/Edit actions, tab bar) depends only on the
 * route's `scriptId`, so it renders immediately — only the data islands (header,
 * tab body) suspend into small colocated skeletons. A missing script is escalated
 * from the header island via {@link NotFoundSignal} and swaps the whole page for
 * the full-page not-found state. The boundary is keyed by `scriptId` so a
 * client-side hop to another script (the router reuses the `[id]` segment)
 * resets a tripped not-found instead of latching it.
 */
export function ScriptDetailsView({ scriptId }: ScriptDetailsViewProps) {
  const editHref = routes.scriptsV2.edit(scriptId);
  const runHref = routes.scriptsV2.run(scriptId);

  const actions = useMemo(
    () => [
      {
        label: 'Run Script',
        href: runHref,
        variant: 'accent' as const,
        // Split button: the divider + arrow half opens the run page in a new tab.
        iconAction: {
          icon: <ArrowRightUpIcon className="w-5 h-5" />,
          'aria-label': 'Open Run Script in new tab',
          href: runHref,
          openInNewTab: true,
        },
      },
    ],
    [runHref],
  );

  const menuActions = useMemo<ActionsMenuGroup[]>(
    () => [
      {
        items: [
          {
            id: 'edit-script',
            label: 'Edit Script',
            icon: <PenEditIcon className="w-6 h-6 text-ods-text-secondary" />,
            href: editHref,
          },
        ],
      },
    ],
    [editHref],
  );

  return (
    <NotFoundBoundary key={scriptId} message="Script not found">
      <ScriptPageChrome
        title="Script Details"
        backFallback={routes.scriptsV2.list}
        actions={actions}
        menuActions={menuActions}
        actionsVariant="menu-primary"
      >
        <div className="flex flex-col gap-[var(--spacing-system-lf)]">
          <Suspense fallback={<ScriptHeaderSkeleton />}>
            <ScriptHeaderSection scriptId={scriptId} />
          </Suspense>

          <TabNavigation tabs={DETAIL_TABS} urlSync defaultTab="details">
            {activeTab =>
              activeTab === 'executions' ? (
                <ScriptExecutionsTab scriptId={scriptId} />
              ) : (
                <Suspense fallback={<ScriptDetailsTabSkeleton />}>
                  <ScriptDetailsTabSection scriptId={scriptId} />
                </Suspense>
              )
            }
          </TabNavigation>
        </div>
      </ScriptPageChrome>
    </NotFoundBoundary>
  );
}
