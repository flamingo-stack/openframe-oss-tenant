'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@app/components/app-layout'
import { FileManagerContainer } from '@/src/app/devices/details/[deviceId]/file-manager/components/file-manager-container'
import { useDeviceDetails } from '@app/devices/hooks/use-device-details'
import { Button, DetailPageContainer } from '@flamingo-stack/openframe-frontend-core'
import { getMeshCentralAgentId } from '@app/devices/utils/device-action-utils'
import { FileManagerSkeleton } from '@flamingo-stack/openframe-frontend-core/components/ui/file-manager'

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
      <AppLayout mainClassName='pb-0 sm:pb-0'>
        <DetailPageContainer
          title='File Manager'
          className='h-full'
          contentClassName='flex flex-col min-h-0 overflow-hidden'
          backButton={{ label: 'Back to Device', onClick: () => router.push(`/devices/details/${deviceId}`) }}
          padding='none'
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-ods-attention-red-error text-lg">
              Error: {error}
            </div>
            <Button variant="outline" onClick={() => router.push(`/devices/details/${deviceId}`)}>
              Return to Device Details
            </Button>
          </div>
        </DetailPageContainer>
      </AppLayout>
    )
  }

  if (!meshcentralAgentId) {
    return (
      <AppLayout mainClassName='pb-0 sm:pb-0'>
        <DetailPageContainer
          title='File Manager'
          className='h-full'
          contentClassName='flex flex-col min-h-0 overflow-hidden'
          backButton={{ label: 'Back to Device', onClick: () => router.push(`/devices/details/${deviceId}`) }}
          padding='none'
        >
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-ods-attention-red-error text-lg">
              MeshCentral Agent ID is required for file manager functionality
            </div>
            <p className="text-ods-text-secondary">
              File manager requires MeshCentral agent to be connected.
            </p>
            <Button variant="outline" onClick={() => router.push(`/devices/details/${deviceId}`)}>
              Return to Device Details
            </Button>
          </div>
        </DetailPageContainer>
      </AppLayout>
    )
  }

  const hostname = deviceDetails?.hostname || deviceDetails?.displayName

  return (
    <AppLayout mainClassName='pb-0 sm:pb-0'>
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
    <AppLayout mainClassName='pb-0 sm:pb-0'>
      <DetailPageContainer
        title='File Manager'
        className='h-full'
        contentClassName='flex flex-col min-h-0 overflow-hidden'
        backButton={{
          label: 'Back to Device',
          onClick: onBack
        }}
        padding='none'
      >
        <div className="flex flex-col flex-1 min-h-0">
          <FileManagerSkeleton />
        </div>
      </DetailPageContainer>
    </AppLayout>
  )
}