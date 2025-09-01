'use client'

import { Card, Button } from '@flamingo/ui-kit/components/ui'

/**
 * Devices page component for OpenFrame Dashboard
 * Device management and monitoring
 */
export function OpenFrameDevicesPage() {
  return (
    <div className="min-h-screen bg-ods-bg p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-ods-text-primary">
            Device Management
          </h1>
          <Button variant="primary">
            Add Device
          </Button>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              Connected Devices
            </h2>
            <p className="text-ods-text-secondary">
              No devices connected yet. Add your first device to get started.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}