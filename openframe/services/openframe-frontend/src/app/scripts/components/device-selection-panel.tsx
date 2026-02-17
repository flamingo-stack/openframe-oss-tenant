'use client'

import {
  DeviceType,
  LoadError,
  SelectableDeviceCard,
  useSmUp,
} from '@flamingo-stack/openframe-frontend-core'
import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import {
  Autocomplete,
  Button,
  Input,
  ListLoader,
} from '@flamingo-stack/openframe-frontend-core/components/ui'
import type { Device } from '../../devices/types/device.types'
import { getDeviceOperatingSystem } from '../../devices/utils/device-status'
import { getDevicePrimaryId } from '../utils/device-helpers'

interface OrganizationOption {
  label: string
  value: string
}

interface DeviceSelectionPanelProps {
  devices: Device[]
  isLoading: boolean
  error?: string | null

  searchTerm: string
  onSearchChange: (value: string) => void

  organizationOptions: OrganizationOption[]
  selectedOrgIds: string[]
  onOrgIdsChange: (ids: string[]) => void

  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  selectedCount: number
}

export function DeviceSelectionPanel({
  devices,
  isLoading,
  error,
  searchTerm,
  onSearchChange,
  organizationOptions,
  selectedOrgIds,
  onOrgIdsChange,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  selectedCount,
}: DeviceSelectionPanelProps) {
  const isSmUp = useSmUp()

  return (
    <>
      {/* Search by Device & Organization */}
      <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div className="text-ods-text-primary font-semibold text-lg">Search by Device</div>
          <Input
            startAdornment={<SearchIcon size={20} />}
            placeholder="Search for Devices"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex-col gap-3 hidden md:flex">
          <div className="text-ods-text-primary font-semibold text-lg">Filter by Organization</div>
          <div className="w-full">
            <Autocomplete
              placeholder="Select Organization"
              options={organizationOptions}
              value={selectedOrgIds}
              onChange={onOrgIdsChange}
              limitTags={2}
            />
          </div>
        </div>
      </div>

      {/* Select All / Clear */}
      <div className="pt-4 flex justify-between">
        <div>
          {selectedCount > 0 && (
            <Button variant="ghost" onClick={onClearSelection} className="text-ods-text-secondary hover:text-ods-text-primary" noPadding>
              Clear Selection ({selectedCount})
            </Button>
          )}
        </div>
        <div>
          <Button
            onClick={onSelectAll}
            variant="link"
            className="text-ods-accent hover:text-ods-accent-hover"
            noPadding
          >
            {isSmUp ? 'Select All Displayed Devices' : 'Select All'}
          </Button>
        </div>
      </div>

      {/* Device Grid */}
      <div className="pt-2">
        {isLoading ? (
          <ListLoader />
        ) : error ? (
          <LoadError message={`Failed to load devices: ${error}`} />
        ) : devices.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
            <p className="text-ods-text-secondary">No devices found. Try adjusting your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {devices.map((device) => {
              const id = getDevicePrimaryId(device)
              const deviceType = device.type?.toLowerCase() as DeviceType
              const isSelected = selectedIds.has(id || '')
              return (
                <SelectableDeviceCard
                  key={id}
                  title={device.displayName || device.hostname}
                  type={deviceType}
                  subtitle={getDeviceOperatingSystem(device.osType)}
                  selected={isSelected}
                  onSelect={() => onToggleSelect(id || '')}
                />
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
