'use client'

import { AppLayout } from '../components/app-layout'
import { ContentPageContainer } from '@flamingo/ui-kit'

export default function Dashboard() {
  return (
    <AppLayout>
      <ContentPageContainer
        title="Dashboard"
        subtitle="Welcome to the OpenFrame Dashboard"
        padding="none"
      >
        {/* Dashboard content will go here */}
        <div className="space-y-6">
          {/* Add dashboard widgets and content here */}
        </div>
      </ContentPageContainer>
    </AppLayout>
  )
}