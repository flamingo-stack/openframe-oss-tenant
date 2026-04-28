'use client';

import { Button, DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { FileManagerSkeleton } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { FileManagerContainer } from '@/app/(app)/devices/details/[deviceId]/file-manager/components/file-manager-container';
import { useDeviceDetails } from '@/app/(app)/devices/hooks/use-device-details';
import { getMeshCentralAgentId } from '@/app/(app)/devices/utils/device-action-utils';

interface FileManagerPageProps {
  params: Promise<{
    deviceId: string;
  }>;
}

export default function FileManagerPage({ params }: FileManagerPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const deviceId = resolvedParams.deviceId;

  const { deviceDetails, isLoading, error } = useDeviceDetails(deviceId, { polling: false });

  const meshcentralAgentId = deviceDetails ? getMeshCentralAgentId(deviceDetails) : undefined;

  if (isLoading) {
    return <FileManagerPageSkeleton onBack={() => router.push(`/devices/details/${deviceId}`)} />;
  }

  if (error) {
    return (
      <DetailPageContainer
        title="File Manager"
        className="h-full"
        contentClassName="flex flex-col min-h-0 overflow-hidden"
        backButton={{ label: 'Back to Device', onClick: () => router.push(`/devices/details/${deviceId}`) }}
        padding="none"
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">Error: {error}</div>
          <Button variant="outline" onClick={() => router.push(`/devices/details/${deviceId}`)}>
            Return to Device Details
          </Button>
        </div>
      </DetailPageContainer>
    );
  }

  if (!meshcentralAgentId) {
    return (
      <DetailPageContainer
        title="File Manager"
        className="h-full"
        contentClassName="flex flex-col min-h-0 overflow-hidden"
        backButton={{ label: 'Back to Device', onClick: () => router.push(`/devices/details/${deviceId}`) }}
        padding="none"
      >
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-ods-attention-red-error text-lg">
            MeshCentral Agent ID is required for file manager functionality
          </div>
          <p className="text-ods-text-secondary">File manager requires MeshCentral agent to be connected.</p>
          <Button variant="outline" onClick={() => router.push(`/devices/details/${deviceId}`)}>
            Return to Device Details
          </Button>
        </div>
      </DetailPageContainer>
    );
  }

  const hostname = deviceDetails?.hostname || deviceDetails?.displayName;

  return <FileManagerContainer deviceId={deviceId} meshcentralAgentId={meshcentralAgentId} hostname={hostname} />;
}

interface FileManagerPageSkeletonProps {
  onBack: () => void;
}

function FileManagerPageSkeleton({ onBack }: FileManagerPageSkeletonProps) {
  return (
    <DetailPageContainer
      title="File Manager"
      className="h-full"
      contentClassName="flex flex-col min-h-0 overflow-hidden"
      backButton={{
        label: 'Back to Device',
        onClick: onBack,
      }}
      padding="none"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <FileManagerSkeleton />
      </div>
    </DetailPageContainer>
  );
}
