'use client';

import { NotFoundError, PageLayout, Tag } from '@flamingo-stack/openframe-frontend-core';
import {
  ArrowRightUpIcon,
  BracketCurlyIcon,
  ClockHistoryIcon,
  PenEditIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  type ActionsMenuGroup,
  type TabItem,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Suspense, useMemo } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { scriptDetailRelayQuery as ScriptDetailQueryType } from '@/__generated__/scriptDetailRelayQuery.graphql';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { scriptDetailRelayQuery } from '@/graphql/scripts/script-detail-relay';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { initiatorName } from '../utils/execution-helpers';
import { envVarsToStrings, platformsToIds, shellToId } from '../utils/script-mappers';
import { ScriptDetailsSkeleton } from './script-details-skeleton';
import { ScriptDetailsTab } from './script-details-tab';
import { ScriptExecutionsTab } from './script-executions-tab';
import { ScriptSummaryCard } from './script-summary-card';

// Two tabs only — Schedules is intentionally omitted from the v2 details page.
const DETAIL_TABS: TabItem[] = [
  { id: 'details', label: 'Script Details', icon: BracketCurlyIcon },
  { id: 'executions', label: 'Execution History', icon: ClockHistoryIcon },
];

interface ScriptDetailsViewProps {
  scriptId: string;
}

function ScriptDetailsContent({ scriptId }: ScriptDetailsViewProps) {
  const data = useLazyLoadQuery<ScriptDetailQueryType>(
    scriptDetailRelayQuery,
    { id: scriptId },
    { fetchPolicy: 'store-and-network' },
  );
  const script = data.script;
  const handleBack = useSafeBack('/scripts-v2');

  useTrackOpenView(script ? { type: CONTEXT_ENTITY_KIND.SCRIPT, id: scriptId, label: script.name || scriptId } : null);

  const editHref = `/scripts-v2/edit/${scriptId}`;
  const runHref = `/scripts-v2/details/${scriptId}/run`;

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

  if (!script) {
    return <NotFoundError message="Script not found" />;
  }

  const shellId = shellToId(script.shell);
  const platforms = platformsToIds(script.supportedPlatforms);
  const args = script.defaultArgs ? [...script.defaultArgs] : [];
  const envVarStrings = envVarsToStrings(script.envVars);
  const authorName = script.author ? initiatorName(script.author) : null;
  const tags = script.tags ?? [];

  return (
    <PageLayout
      title="Script Details"
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      menuActions={menuActions}
      actionsVariant="menu-primary"
      className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6">
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
          shellId={shellId}
          platforms={platforms}
          timeoutSeconds={script.defaultTimeoutSeconds}
          author={authorName}
        />

        <TabNavigation tabs={DETAIL_TABS} urlSync defaultTab="details">
          {activeTab =>
            activeTab === 'executions' ? (
              <ScriptExecutionsTab scriptId={scriptId} />
            ) : (
              <ScriptDetailsTab
                args={args}
                envVarStrings={envVarStrings}
                scriptBody={script.scriptBody}
                shellId={shellId}
              />
            )
          }
        </TabNavigation>
      </div>
    </PageLayout>
  );
}

export function ScriptDetailsView({ scriptId }: ScriptDetailsViewProps) {
  return (
    <Suspense fallback={<ScriptDetailsSkeleton />}>
      <ScriptDetailsContent scriptId={scriptId} />
    </Suspense>
  );
}
