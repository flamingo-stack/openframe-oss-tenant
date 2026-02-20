'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@app/components/app-layout'
import { FileManagerContainer } from '@/src/app/devices/details/[deviceId]/file-manager/components/file-manager-container'
import { useDeviceDetails } from '@app/devices/hooks/use-device-details'
import { Button, Skeleton } from '@flamingo-stack/openframe-frontend-core'
import { getMeshCentralAgentId } from '@app/devices/utils/device-action-utils'
import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core'
import { FileManagerSkeleton } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'
import { ChevronLeft } from 'lucide-react'

interface FileManagerPageProps {
  params: Promise<{
    deviceId: string
  }>
}

export default function FileManagerPage({ params }: FileManagerPageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const deviceId = resolvedParams.deviceId

  const { deviceDetails, isLoading, error, fetchDeviceById } = useDeviceDetails()

  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])

  const meshcentralAgentId = deviceDetails ? getMeshCentralAgentId(deviceDetails) : undefined

  if (isLoading) {
    return (
      <FileManagerPageSkeleton onBack={() => router.push(`/devices/details/${deviceId}`)} />
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="text-ods-attention-red-error">
            Error: {error}
          </div>
          <button
            className="mt-4 text-ods-text-secondary hover:text-ods-text-primary underline"
            onClick={() => router.push(`/devices/details/${deviceId}`)}
          >
            Return to Device Details
          </button>
        </div>
      </AppLayout>
    )
  }

  if (!meshcentralAgentId) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="text-ods-attention-red-error">
            Error: MeshCentral Agent ID is required for file manager functionality
          </div>
          <button
            className="mt-4 text-ods-text-secondary hover:text-ods-text-primary underline"
            onClick={() => router.push(`/devices/details/${deviceId}`)}
          >
            Return to Device Details
          </button>
        </div>
      </AppLayout>
    )
  }

  const hostname = deviceDetails?.hostname || deviceDetails?.displayName

  return (
    <AppLayout>
      <FileManagerContainer
        deviceId={deviceId}
        meshcentralAgentId={meshcentralAgentId}
        hostname={hostname}
      />
    </AppLayout>
  )
}

interface FileManagerPageSkeletonProps {
  onBack: () => void
}

function FileManagerPageSkeleton({ onBack }: FileManagerPageSkeletonProps) {
  return (
    <AppLayout>
      <DetailPageContainer
        title={'File Manager'}
        backButton={{
          label: 'Back to Device',
          onClick: onBack
        }}
        padding='none'
      >
        <FileManagerSkeleton />
      </DetailPageContainer>
    </AppLayout>
  )
}