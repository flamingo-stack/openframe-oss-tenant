'use client'

import React, { useMemo } from 'react'
import { Device, Software } from '../../types/device.types'
import { Table, StatusTag, SoftwareInfo, SoftwareSourceBadge } from '@flamingo-stack/openframe-frontend-core'
import type { TableColumn } from '@flamingo-stack/openframe-frontend-core'
import type { SoftwareSource } from '@flamingo-stack/openframe-frontend-core'

interface SoftwareTabProps {
  device: Device | null
}

export function SoftwareTab({ device }: SoftwareTabProps) {
  const software = device?.software || []

  // Format date for display - matches device-info-section.tsx format
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
  }

  // Define table columns
  const columns: TableColumn<Software>[] = useMemo(() => [
    {
      key: 'name',
      label: 'SOFTWARE',
      width: 'w-[40%]',
      sortable: true,
      renderCell: (item: Software) => (
        <SoftwareInfo name={item.name} vendor={item.vendor} version={item.version} />
      )
    },
    {
      key: 'source',
      label: 'SOURCE',
      width: 'w-[20%]',
      sortable: true,
      renderCell: (item: Software) => (
        <SoftwareSourceBadge source={item.source as SoftwareSource} />
      )
    },
    {
      key: 'vulnerabilities',
      label: 'SECURITY',
      width: 'w-[15%]',
      sortable: true,
      sortValue: (item: Software) => item.vulnerabilities.length,
      renderCell: (item: Software) => {
        const vulnCount = item.vulnerabilities.length
        if (vulnCount === 0) {
          return (
            <StatusTag
              label="NO ISSUES"
              variant="success"
              className="px-2 py-1 text-[12px] leading-[16px]"
            />
          )
        }
        return (
          <StatusTag
            label={`${vulnCount} ${vulnCount === 1 ? 'ISSUE' : 'ISSUES'}`}
            variant="error"
            className="px-2 py-1 text-[12px] leading-[16px]"
          />
        )
      }
    },
    {
      key: 'last_opened_at',
      label: 'LAST OPENED',
      width: 'w-[25%]',
      sortable: true,
      renderCell: (item: Software) => (
        <div className="font-['DM_Sans'] font-medium text-ods-text-primary">
          {formatDate(item.last_opened_at)}
        </div>
      )
    }
  ], [])

  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    )
  }

  if (software.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No software data available for this device</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          Installed Software ({software.length})
        </h3>
      </div>

      <Table
        data={software}
        columns={columns}
        rowKey="id"
        rowClassName="mb-1"
      />
    </div>
  )
}
