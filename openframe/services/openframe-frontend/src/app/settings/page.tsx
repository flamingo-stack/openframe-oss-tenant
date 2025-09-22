'use client'

export const dynamic = 'force-dynamic'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'

export default function Settings() {
  return (
    <AppLayout>
      <ContentPageContainer
        title="Settings"
        subtitle="Configure your OpenFrame settings"
        padding="none"
      >
        {/* Settings content will go here */}
        <div className="space-y-6">
          <div className="bg-ods-card border border-ods-border rounded-lg p-6">
            <p className="text-ods-text-secondary">Settings interface coming soon...</p>
          </div>
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}