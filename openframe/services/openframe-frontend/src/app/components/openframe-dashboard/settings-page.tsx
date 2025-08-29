'use client'

import { Card } from '@flamingo/ui-kit/components/ui'

/**
 * Settings page component for OpenFrame Dashboard
 * Application and user settings
 */
export function OpenFrameSettingsPage() {
  return (
    <div className="min-h-screen bg-ods-bg p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-ods-text-primary mb-8">
          Settings
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              Organization Settings
            </h2>
            <p className="text-ods-text-secondary">
              Manage your organization profile and preferences
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              User Preferences
            </h2>
            <p className="text-ods-text-secondary">
              Customize your personal settings and notifications
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              API Configuration
            </h2>
            <p className="text-ods-text-secondary">
              Manage API keys and external integrations
            </p>
          </Card>
          
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-ods-text-primary mb-4">
              Security
            </h2>
            <p className="text-ods-text-secondary">
              Configure authentication and security settings
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}