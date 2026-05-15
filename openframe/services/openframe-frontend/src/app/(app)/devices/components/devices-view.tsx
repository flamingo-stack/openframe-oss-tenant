'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { DevicesList, DevicesViewModeToggle } from '@/app/components/shared/devices-list';

export function DevicesView() {
  const router = useRouter();

  return (
    <PageLayout
      title="Devices"
      actionsVariant="icon-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      selector={<DevicesViewModeToggle />}
      actions={[
        {
          label: 'Add Device',
          onClick: () => router.push('/devices/new'),
          icon: <PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />,
          variant: 'outline',
        },
      ]}
      contentClassName="flex flex-col"
    >
      <div>
        <DevicesList enableGrid />
      </div>
    </PageLayout>
  );
}
