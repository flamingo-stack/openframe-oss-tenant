'use client';

import { LoadError, NotFoundError, PageLayout, ScriptInfoSection } from '@flamingo-stack/openframe-frontend-core';
import { ArrowRightUpIcon, PenEditIcon, PlayIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useMemo } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { CONTEXT_ENTITY_KIND } from '../../../mingo/context/context-types';
import { useTrackOpenView } from '../../../mingo/context/use-track-open-view';
import { useScriptDetails } from '../../hooks/use-script-details';
import { ScriptArgumentsCard } from './script-arguments-card';
import { ScriptDetailsSkeleton } from './script-details-skeleton';
import { ScriptEditor } from './script-editor';

interface ScriptDetailsViewProps {
  scriptId: string;
}

export function ScriptDetailsView({ scriptId }: ScriptDetailsViewProps) {
  const { scriptDetails, isLoading, error } = useScriptDetails(scriptId);
  const handleBack = useSafeBack(routes.scripts.list());

  // Register this script as the Mingo "open view" (cleared → recent on unmount).
  useTrackOpenView(
    scriptDetails ? { type: CONTEXT_ENTITY_KIND.SCRIPT, id: scriptId, label: scriptDetails.name || scriptId } : null,
  );

  const editHref = routes.scripts.edit(scriptId);
  const runHref = scriptDetails?.id ? routes.scripts.run(scriptDetails.id) : undefined;

  const actions = useMemo(
    () => [
      {
        label: 'Edit Script',
        variant: 'outline' as const,
        icon: <PenEditIcon size={20} />,
        href: editHref,
      },
      ...(runHref
        ? [
            {
              label: 'Run Script',
              icon: <PlayIcon size={20} />,
              href: runHref,
              variant: 'accent' as const,
            },
          ]
        : []),
    ],
    [editHref, runHref],
  );

  if (isLoading) {
    return <ScriptDetailsSkeleton />;
  }

  if (error) {
    return <LoadError message={`Error loading script: ${error}`} />;
  }

  if (!scriptDetails) {
    return <NotFoundError message="Script not found" />;
  }

  return (
    <PageLayout
      title={scriptDetails.name}
      backButton={{
        label: 'Back',
        onClick: handleBack,
      }}
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      {/* Main Content */}
      <div className="flex flex-col overflow-auto gap-6">
        <ScriptInfoSection
          headline={scriptDetails.description}
          subheadline={'Description'}
          shellType={scriptDetails.shell}
          supportedPlatforms={scriptDetails.supported_platforms}
          category={scriptDetails.category}
        />
        {/* Script Arguments and Environment Variables */}
        {(scriptDetails.args?.length > 0 || scriptDetails.env_vars?.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {scriptDetails.args?.length > 0 ? (
              <ScriptArgumentsCard title="Default Script Arguments" args={scriptDetails.args} separator=" " />
            ) : (
              <div />
            )}
            {scriptDetails.env_vars?.length > 0 && (
              <ScriptArgumentsCard title="Environment Vars" args={scriptDetails.env_vars} />
            )}
          </div>
        )}
        {/* Script Syntax */}
        {scriptDetails.script_body && (
          <div className="flex flex-col gap-1">
            <div className="text-h5 text-ods-text-secondary w-full">Syntax</div>
            <ScriptEditor value={scriptDetails.script_body} shell={scriptDetails.shell} readOnly height="400px" />
          </div>
        )}{' '}
      </div>
    </PageLayout>
  );
}
