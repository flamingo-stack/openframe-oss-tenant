'use client'

import { Card } from '@flamingo/ui-kit/components/ui'

/**
 * Main dashboard page component for OpenFrame
 * Device management and system monitoring
 */
export function OpenFrameDashboardPage() {
  return (
    <div className="min-h-screen bg-ods-bg p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-ods-text-primary mb-8">
          OpenFrame Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              Device Management
            </h2>
            <p className="text-ods-text-secondary">
              Manage and monitor connected devices
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              System Monitoring
            </h2>
            <p className="text-ods-text-secondary">
              Real-time system health and performance
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              Remote Access
            </h2>
            <p className="text-ods-text-secondary">
              Remote connection and file transfer
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}