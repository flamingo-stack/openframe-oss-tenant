'use client';

import { Button, PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { FileManagerSkeleton } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager';
import { use } from 'react';
import { FileManagerContainer } from '@/app/(app)/devices/details/[deviceId]/file-manager/components/file-manager-container';
import { useDeviceDetails } from '@/app/(app)/devices/hooks/use-device-details';
import { getMeshCentralAgentId } from '@/app/(app)/devices/utils/device-action-utils';
import { useSafeBack } from '@/app/hooks/use-safe-back';

// Horizontal padding only — `PageLayout`'s `TitleBlock` already supplies the
// top padding (`pt-[var(--spacing-system-l)]` = 16/24px, matching the former pt-4/md:pt-6).
const PAGE_PADDING = 'px-4 md:px-6';

interface FileManagerPageProps {
  params: Promise<{
    deviceId: string;
  }>;
}

export default function FileManagerPage({ params }: FileManagerPageProps) {
  const resolvedParams = use(params);
  const deviceId = resolvedParams.deviceId;
  const handleBack = useSafeBack(`/devices/details/${deviceId}`);

  const { deviceDetails, isLoading, error } = useDeviceDetails(deviceId, { polling: false });

  const meshcentralAgentId = deviceDetails ? getMeshCentralAgentId(deviceDetails) : undefined;

  if (isLoading) {
    return <FileManagerPageSkeleton onBack={handleBack} />;
  }

  if (error) {
    return (
      <PageLayout
        title="File Manager"
        className={`${PAGE_PADDING} h-full`}
        contentClassName="flex flex-col min-h-0 overflow-hidden"
        backButton={{ label: 'Back', onClick: handleBack }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">Error: {error}</div>
          <Button variant="outline" onClick={handleBack}>
            Return to Device Details
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (!meshcentralAgentId) {
    return (
      <PageLayout
        title="File Manager"
        className={`${PAGE_PADDING} h-full`}
        contentClassName="flex flex-col min-h-0 overflow-hidden"
        backButton={{ label: 'Back', onClick: handleBack }}
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">
            MeshCentral Agent ID is required for file manager functionality
          </div>
          <p className="text-ods-text-secondary">File manager requires MeshCentral agent to be connected.</p>
          <Button variant="outline" onClick={handleBack}>
            Return to Device Details
          </Button>
        </div>
      </PageLayout>
    );
  }

  const hostname = deviceDetails?.hostname || deviceDetails?.displayName;

  return (
    <FileManagerContainer
      deviceId={deviceId}
      meshcentralAgentId={meshcentralAgentId}
      hostname={hostname}
      className={PAGE_PADDING}
    />
  );
}

interface FileManagerPageSkeletonProps {
  onBack: () => void;
}

function FileManagerPageSkeleton({ onBack }: FileManagerPageSkeletonProps) {
  return (
    <PageLayout
      title="File Manager"
      className={`${PAGE_PADDING} h-full`}
      contentClassName="flex flex-col min-h-0 overflow-hidden"
      backButton={{
        label: 'Back',
        onClick: onBack,
      }}
    >
      <div className="flex flex-col flex-1 min-h-0">
        <FileManagerSkeleton />
      </div>
    </PageLayout>
  );
}
