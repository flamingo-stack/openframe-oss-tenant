'use client';

export const dynamic = 'force-dynamic';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ActivityIcon,
  BracketCurlyIcon,
  MonitorIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useAskMingo } from '@/app/(app)/mingo/hooks/use-ask-mingo';
import { DevicesPanel, EmptyState } from '@/app/components/shared';
import { useHasOrganizations } from './hooks/use-has-organizations';

export default function Devices() {
  const askMingo = useAskMingo();
  const { hasOrganizations, isLoading } = useHasOrganizations();

  // While checking organization status, disable Add Device as a safety measure.
  // This prevents users from starting the flow while we're still determining eligibility.
  const noOrganizations = isLoading || hasOrganizations === false;

  return (
    <DevicesPanel
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      noOrganizations={noOrganizations}
      emptyState={
        <EmptyState
          icon={<MonitorIcon />}
          title="No devices connected"
          description="Devices (laptops, servers, workstations, mobile) you monitor and manage across all client Customers will be displayed here."
          actions={[
            { icon: <ActivityIcon />, label: 'Monitor health, CPU, memory, and disk usage in real time' },
            { icon: <BracketCurlyIcon />, label: 'Run scripts, policies, and queries across one or many devices' },
            { icon: <TerminalIcon />, label: 'Launch remote sessions and view full software inventory' },
          ]}
          buttonLabel="Ask Mingo about Devices"
          buttonIcon={
            <MingoIcon
              className="size-5"
              eyesColor="var(--ods-flamingo-cyan-base)"
              cornerColor="var(--ods-flamingo-cyan-base)"
            />
          }
          onButtonClick={() => askMingo('devices')}
        />
      }
    />
  );
}
