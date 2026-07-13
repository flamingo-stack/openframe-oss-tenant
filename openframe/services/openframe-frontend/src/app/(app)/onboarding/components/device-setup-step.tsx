'use client';

import { CheckCircleIcon, DotsLoaderIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Autocomplete, type AutocompleteOption, Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { DEFAULT_OS_PLATFORM, type OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useDevicesOverview } from '@/app/(app)/dashboard/hooks/use-dashboard-stats';
import { OrgAvatar } from '@/app/components/shared';
import { OsPlatformSelector } from '@/app/components/shared/os-platform-selector';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import { EVENT_SUBTYPE, trackDashboardActivity } from '@/lib/analytics';
import { AVAILABLE_PLATFORMS, DISABLED_PLATFORMS } from '@/lib/platforms';
import { useDeviceOrganizations } from '../../devices/hooks/use-device-organizations';
import { useInstallCommand } from '../../devices/hooks/use-install-command';
import { onboardingHintUrl } from '../onboarding-coach-marks';

/**
 * Inner body of the "Device Management" onboarding step. Reuses the device-page building
 * blocks ({@link ../../devices/new/new-device-content}) — the customer `Autocomplete`,
 * `OsPlatformSelector`, and the `useDeviceOrganizations` / `useInstallCommand` hooks — to
 * surface the install command. Once a device is connected the step is completed
 * explicitly via "Mark as Complete" (which persists to the backend).
 */
export function DeviceSetupStep({
  onComplete,
  onCompleteBackground,
  completed,
  completing,
}: {
  onComplete?: () => void;
  onCompleteBackground?: () => void;
  completed?: boolean;
  completing?: boolean;
} = {}) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const orgs = useDeviceOrganizations(100);

  // Once at least one device exists, the install flow gives way to the
  // "Go to Devices" + "Mark as Complete" actions.
  const { total: deviceCount } = useDevicesOverview();
  const hasDevice = deviceCount > 0;

  const [organizationId, setOrganizationId] = useState('');
  const [platform, setPlatform] = useState<OSPlatformId>(DEFAULT_OS_PLATFORM);

  // Default the customer to the tenant's default org (then the first one) once loaded.
  useEffect(() => {
    if (orgs.length > 0 && !organizationId) {
      const defaultOrg = orgs.find(o => o.isDefault) ?? orgs[0];
      if (defaultOrg) setOrganizationId(defaultOrg.organizationId);
    }
  }, [orgs, organizationId]);

  const { command, initialKey } = useInstallCommand({ organizationId, platform });

  const orgOptions: AutocompleteOption[] = useMemo(
    () => orgs.map(o => ({ label: o.name, value: o.organizationId })),
    [orgs],
  );
  const selectedOrg = orgs.find(o => o.organizationId === organizationId);

  const { copy, copied } = useCopyToClipboard({
    successDescription: 'Installer command copied to clipboard',
    errorDescription: 'Could not copy command',
  });

  const handleCopyCommand = () => {
    if (!organizationId) {
      toast({ title: 'Validation error', description: 'Please select a customer', variant: 'destructive' });
      return;
    }
    if (!initialKey) {
      toast({ title: 'Secret unavailable', description: 'Registration secret not loaded yet', variant: 'destructive' });
      return;
    }
    trackDashboardActivity(EVENT_SUBTYPE.ADD_DEVICE);
    copy(command);
  };

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Setup and run command on a client machine to install the OpenFrame agent. Once installed, users will get an
        in-app AI assistant that helps them troubleshoot and resolve issues. The step completes automatically once the
        device comes online.
      </p>

      {/* Select Customer / Select Platform */}
      <div className="grid grid-cols-1 gap-[var(--spacing-system-m)] md:grid-cols-2">
        <Autocomplete
          options={orgOptions}
          value={organizationId || null}
          onChange={val => setOrganizationId(val ?? '')}
          label="Select Customer"
          placeholder="Choose customer"
          startAdornment={
            selectedOrg ? (
              <span className="group-has-[:focus]:hidden">
                <OrgAvatar imageUrl={selectedOrg.imageUrl} hash={selectedOrg.imageHash} name={selectedOrg.name} />
              </span>
            ) : undefined
          }
          renderOption={option => {
            const org = orgs.find(o => o.organizationId === option.value);
            return (
              <div className="flex w-full items-center gap-2">
                <OrgAvatar imageUrl={org?.imageUrl} hash={org?.imageHash} name={org?.name ?? option.label} />
                <span>{option.label}</span>
              </div>
            );
          }}
        />
        <OsPlatformSelector
          value={platform}
          onValueChange={setPlatform}
          label="Select Platform"
          disabledPlatforms={DISABLED_PLATFORMS}
          options={AVAILABLE_PLATFORMS.map(p => ({ platformId: p.id }))}
        />
      </div>

      {/* OpenFrame Installation Script — click the box to copy */}
      <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
        <p className="text-h4 text-ods-text-primary">OpenFrame Installation Script</p>
        <button
          type="button"
          onClick={handleCopyCommand}
          className="flex w-full flex-col items-start gap-[var(--spacing-system-s)] overflow-hidden rounded-md border border-ods-border bg-ods-card p-[var(--spacing-system-m)] text-left transition-colors hover:bg-ods-bg-hover"
        >
          <p className="w-full break-all text-h4 text-ods-text-primary">{command}</p>
          <p className="text-h4 text-ods-text-secondary">
            {copied ? 'Copied to clipboard' : 'Click on the command to copy'}
          </p>
        </button>
      </div>

      {/* Device connected → "Mark as Complete" + "Go to Devices"; otherwise the
          waiting status. Completion is explicit (persisted to the backend). */}
      {hasDevice ? (
        <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
          <p className="text-h6 text-ods-text-secondary md:flex-1">
            Device connected. <span className="md:block">Manage it from the Devices page.</span>
          </p>
          <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:w-auto md:flex-row md:items-center">
            {!completed && (
              <Button
                variant="outline"
                leftIcon={<CheckCircleIcon className="size-5" />}
                onClick={() => onComplete?.()}
                loading={completing}
                disabled={completing}
                className="w-full md:w-auto"
              >
                Mark as Complete
              </Button>
            )}
            <Button
              variant="accent"
              onClick={() => {
                // "Go to Devices" is only reachable once a device is connected, so
                // navigating here completes the step — in the background, no spinner.
                if (!completed) onCompleteBackground?.();
                router.push(onboardingHintUrl('/devices', 'devices', pathname));
              }}
              className="w-full md:w-auto"
            >
              Go to Devices
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
          {/* One line on mobile, broken into two lines from md up. */}
          <p className="text-h6 text-ods-text-secondary md:flex-1">
            Run the command on a client machine <span className="md:block">to connect your first device</span>
          </p>
          <div className="flex items-center justify-center gap-[var(--spacing-system-xs)] px-[var(--spacing-system-m)] py-[var(--spacing-system-sf)] text-ods-text-secondary md:justify-end">
            <DotsLoaderIcon size={24} />
            <span className="whitespace-nowrap text-h4">Waiting for first device</span>
          </div>
        </div>
      )}
    </div>
  );
}
