'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

interface UsersTabProps {
  device: any
}

export function UsersTab({ device }: UsersTabProps) {
  return (
    <div className="space-y-4">
      <InfoCard
        data={{
          title: "Logged User",
          items: [
            { label: 'Username', value: device?.logged_in_username || 'Unknown' }
          ]
        }}
      />
    </div>
  )
}
