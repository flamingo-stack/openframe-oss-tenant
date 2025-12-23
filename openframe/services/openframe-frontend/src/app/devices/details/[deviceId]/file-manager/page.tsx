'use client'

import React, { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@app/components/app-layout'
import { FileManagerContainer } from '@/src/app/devices/details/[deviceId]/file-manager/components/file-manager-container'
import { useDeviceDetails } from '@app/devices/hooks/use-device-details'
import { Button, Skeleton } from '@flamingo-stack/openframe-frontend-core'
import { getMeshCentralAgentId } from '@app/devices/utils/device-action-utils'
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
      <div className="flex flex-col h-full gap-6 pt-6">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            leftIcon={<ChevronLeft className="h-4 w-4" />}
            className="self-start text-ods-text-secondary hover:text-ods-text-primary"
          >
            Back to Device
          </Button>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <FileManagerSkeleton />
      </div>
    </AppLayout>
  )
}