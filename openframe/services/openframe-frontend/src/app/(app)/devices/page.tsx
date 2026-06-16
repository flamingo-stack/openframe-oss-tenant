'use client';

export const dynamic = 'force-dynamic';

import { MingoIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  ActivityIcon,
  BracketCurlyIcon,
  MonitorIcon,
  TerminalIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { DevicesPanel, EmptyState } from '@/app/components/shared';

export default function Devices() {
  return (
    <DevicesPanel
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
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
        />
      }
    />
  );
}
