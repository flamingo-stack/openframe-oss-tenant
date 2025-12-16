'use client'

export const dynamic = 'force-dynamic'

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core/components/ui'

export default function NotFound() {
  return (
    <ContentPageContainer
      title="Page Not Found"
      subtitle="The page you're looking for doesn't exist."
    >
      <div />
    </ContentPageContainer>
  )
}
