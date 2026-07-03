'use client';

import {
  ChatsIcon,
  CheckCircleIcon,
  ComputerMouseIcon,
  TagIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete, type AutocompleteOption, Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { useDevices } from '../../devices/hooks/use-devices';

/** Icon + title + description row, shared by the numbered steps. */
function StepRow({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex w-full items-start gap-[var(--spacing-system-m)]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-ods-border bg-ods-bg text-ods-text-secondary [&_svg]:size-4 md:h-12 md:w-12 md:[&_svg]:size-6">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-h3 font-bold text-ods-text-primary">{title}</p>
        <p className="text-h4 text-ods-text-primary">{description}</p>
      </div>
    </div>
  );
}

/** Uppercase section label + content, e.g. "STEP 1". */
function LabeledBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-xxs)]">
      <p className="text-h5 text-ods-text-secondary">{label}</p>
      {children}
    </div>
  );
}

const INSIDE_TICKET_POINTS = [
  'Set a title and description to document the issue clearly.',
  'Assign it to a specific technician on your team.',
  'Attach files, add tags to categorize by issue type or client.',
  'Leave internal notes visible only to your team - not the client.',
  'Take over the chat directly. Assistant goes silent and you talk to the client one-on-one.',
];

/**
 * Inner body of the "Tickets" onboarding step — an informational walkthrough. The Step 1
 * device picker reuses the devices list ({@link ../../devices/hooks/use-devices}) and links
 * into the device's remote shell; the footer links to the Tickets section.
 */
export function TicketsStep() {
  const router = useRouter();
  const { toast } = useToast();
  const { devices } = useDevices();

  const [deviceId, setDeviceId] = useState('');

  const deviceOptions: AutocompleteOption[] = useMemo(
    () => devices.map(d => ({ label: d.displayName || d.hostname || d.machineId, value: d.machineId })),
    [devices],
  );

  const connectToDevice = () => {
    if (!deviceId) {
      toast({ title: 'Select a device', description: 'Choose a device to connect to', variant: 'destructive' });
      return;
    }
    router.push(`/devices/details/remote-shell?id=${deviceId}`);
  };

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      {/* Intro (left) / demo video (right) */}
      <div className="flex w-full flex-col items-start gap-[var(--spacing-system-l)] md:flex-row">
        <p className="flex-1 text-h4 text-ods-text-primary">
          Every conversation AI Assistant handles is logged as a ticket. Your team can review what happened, add
          context, and step in whenever needed.
        </p>
        <div className="flex aspect-[976/558] w-full flex-1 items-center justify-center rounded-md border border-ods-text-secondary bg-ods-border">
          <span className="font-mono text-h2 text-ods-text-secondary">DEMO VIDEO</span>
        </div>
      </div>

      {/* Steps */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
        <LabeledBlock label="Step 1">
          <div className="flex w-full flex-col overflow-hidden rounded-md border border-ods-border bg-ods-card [&>*]:border-b [&>*]:border-ods-border [&>*:last-child]:border-b-0">
            <div className="p-[var(--spacing-system-m)]">
              <StepRow
                icon={<ComputerMouseIcon size={24} />}
                title="Connect Remotely to Device"
                description="Use remote access tool to open a session on the device you just connected to your Customer."
              />
            </div>
            <div className="flex flex-col items-stretch gap-[var(--spacing-system-m)] p-[var(--spacing-system-m)] md:flex-row md:items-end">
              <div className="min-w-0 flex-1">
                <Autocomplete
                  options={deviceOptions}
                  value={deviceId || null}
                  onChange={val => setDeviceId(val ?? '')}
                  label="Select Device for Remote Connection"
                  placeholder="Choose device"
                />
              </div>
              <Button variant="outline" onClick={connectToDevice} className="w-full md:w-auto">
                Connect to Device
              </Button>
            </div>
          </div>
        </LabeledBlock>

        <LabeledBlock label="Step 2">
          <div className="w-full rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-m)]">
            <StepRow
              icon={<ChatsIcon size={24} />}
              title="Send a Message to Assistant"
              description={'Open OpenFrame and write something like: "Check for software updates".'}
            />
          </div>
        </LabeledBlock>

        <LabeledBlock label="Step 3">
          <div className="w-full rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-m)]">
            <StepRow
              icon={<TagIcon size={24} />}
              title="Go to Tickets Section"
              description="You will see a new ticket, the assistant chat history, and all ticket details."
            />
          </div>
        </LabeledBlock>
      </div>

      {/* Inside a ticket */}
      <LabeledBlock label="Inside a ticket">
        <div className="flex w-full flex-col gap-[var(--spacing-system-xs)] rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-m)]">
          <p className="text-h4 text-ods-text-primary">
            Once a ticket is open, your team can add context and take action:
          </p>
          <ul className="flex w-full flex-col">
            {INSIDE_TICKET_POINTS.map(point => (
              <li key={point} className="flex items-start gap-[var(--spacing-system-xs)]">
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <span className="size-1.5 rounded-full bg-ods-accent" />
                </span>
                <span className="flex-1 text-h4 text-ods-text-primary">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </LabeledBlock>

      {/* Footer actions */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <div className="hidden flex-1 md:block" />
        <div className="hidden flex-1 md:block" />
        <Button
          variant="outline"
          leftIcon={<CheckCircleIcon className="size-5" />}
          onClick={() => toast({ title: 'Step marked complete', variant: 'success' })}
          className="w-full md:flex-1"
        >
          Mark as Complete
        </Button>
        <Button variant="accent" onClick={() => router.push('/tickets')} className="w-full md:flex-1">
          Go to Tickets
        </Button>
      </div>
    </div>
  );
}
