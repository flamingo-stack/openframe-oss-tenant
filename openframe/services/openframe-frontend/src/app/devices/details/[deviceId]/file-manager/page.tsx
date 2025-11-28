'use client'

import React, { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@app/components/app-layout'
import { FileManagerContainer } from '@app/devices/components/file-manager-container'
import { useDeviceDetails } from '@app/devices/hooks/use-device-details'
import { CardLoader } from '@flamingo/ui-kit'
import { getMeshCentralAgentId } from '@app/devices/utils/device-action-utils'

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
  
  // Fetch device details on mount
  useEffect(() => {
    if (deviceId) {
      fetchDeviceById(deviceId)
    }
  }, [deviceId, fetchDeviceById])
  
  // Get MeshCentral agent ID from device details
  const meshcentralAgentId = deviceDetails ? getMeshCentralAgentId(deviceDetails) : undefined
  
  // Show loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4">
          <CardLoader items={1} />
        </div>
      </AppLayout>
    )
  }
  
  // Show error if device not found
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
  
  // Check if MeshCentral agent is available
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
  
  // Extract device information
  const hostname = deviceDetails?.hostname || deviceDetails?.displayName
  const organizationName = typeof deviceDetails?.organization === 'string' 
    ? deviceDetails.organization 
    : deviceDetails?.organization

  return (
    <AppLayout>
      <FileManagerContainer
        deviceId={deviceId}
        meshcentralAgentId={meshcentralAgentId}
        hostname={hostname}
        organizationName={organizationName}
      />
    </AppLayout>
  )
}