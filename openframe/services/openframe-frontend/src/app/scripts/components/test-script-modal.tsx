'use client'

import { Button, DeviceType, Modal, ModalFooter, ModalHeader, ModalTitle, SelectableDeviceCard } from '@flamingo-stack/openframe-frontend-core'
import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2'
import { Autocomplete, Input, Label, ListLoader } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { apiClient } from '@lib/api-client'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEVICE_STATUS } from '../../devices/constants/device-statuses'
import { GET_DEVICES_QUERY } from '../../devices/queries/devices-queries'
import { Device, DevicesGraphQLNode, GraphQLResponse } from '../../devices/types/device.types'
import { getDeviceOperatingSystem } from '../../devices/utils/device-status'
import { createDeviceListItem } from '../../devices/utils/device-transform'
import { getTacticalAgentId } from '../../devices/utils/device-action-utils'
import { useOrganizationsMin } from '../../organizations/hooks/use-organizations-min'
import { getDevicePrimaryId } from '../utils/device-helpers'
import { mapPlatformsToOsTypes } from '../utils/script-utils'

export interface SelectedTestDevice {
  agentToolId: string
  deviceName: string
}

interface TestScriptModalProps {
  isOpen: boolean
  onClose: () => void
  onDeviceSelected: (device: SelectedTestDevice) => void
  supportedPlatforms: string[]
}

export function TestScriptModal({
  isOpen,
  onClose,
  onDeviceSelected,
  supportedPlatforms
}: TestScriptModalProps) {
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 300)
  const [allDevices, setAllDevices] = useState<Device[]>([])
  const [isLoadingDevices, setIsLoadingDevices] = useState(false)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const hasFetchedRef = useRef(false)
  const prevPlatformsRef = useRef<string>(JSON.stringify(supportedPlatforms))
  const abortControllerRef = useRef<AbortController | null>(null)

  // Organization filter
  const { items: allOrganizations, fetch: fetchOrgs } = useOrganizationsMin()
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>([])

  useEffect(() => {
    if (isOpen) {
      fetchOrgs('')
    }
  }, [isOpen, fetchOrgs])

  // Invalidate cached devices when supported platforms change
  useEffect(() => {
    const key = JSON.stringify(supportedPlatforms)
    if (key !== prevPlatformsRef.current) {
      prevPlatformsRef.current = key
      hasFetchedRef.current = false
      abortControllerRef.current?.abort()
      setAllDevices([])
      setSelectedDeviceId(null)
    }
  }, [supportedPlatforms])

  const organizationOptions = useMemo(() => {
    return allOrganizations.map(org => ({
      label: org.name,
      value: org.organizationId,
    }))
  }, [allOrganizations])

  // Client-side filtered devices (by search term + selected orgs)
  const filteredDevices = useMemo(() => {
    let filtered = allDevices
    const term = (debouncedSearch || '').toLowerCase()
    if (term) {
      filtered = filtered.filter(d => {
        const name = (d.displayName || d.hostname || '').toLowerCase()
        const os = (d.osType || '').toLowerCase()
        return name.includes(term) || os.includes(term)
      })
    }
    if (selectedOrgIds.length > 0) {
      filtered = filtered.filter(d => d.organizationId && selectedOrgIds.includes(d.organizationId))
    }
    return filtered
  }, [allDevices, debouncedSearch, selectedOrgIds])

  const fetchDevices = useCallback(async () => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoadingDevices(true)
    try {
      const osTypes = mapPlatformsToOsTypes(supportedPlatforms || [])

      const filter = {
        statuses: [DEVICE_STATUS.ONLINE],
        ...(osTypes.length > 0 && { osTypes })
      }

      const response = await apiClient.post<GraphQLResponse<{ devices: {
        edges: Array<{ node: DevicesGraphQLNode, cursor: string }>
        pageInfo: { hasNextPage: boolean, endCursor?: string }
        filteredCount: number
      }}>>('/api/graphql', {
        query: GET_DEVICES_QUERY,
        variables: {
          filter,
          pagination: { limit: 100, cursor: null },
          search: ''
        }
      }, { signal: controller.signal })

      if (controller.signal.aborted) return

      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch devices')
      }

      const graphqlResponse = response.data
      if (!graphqlResponse?.data) {
        throw new Error('No data received from server')
      }
      if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
        throw new Error(graphqlResponse.errors[0].message)
      }

      const nodes = graphqlResponse.data.devices.edges.map(e => e.node)
      const items = nodes.map(createDeviceListItem)
      setAllDevices(items)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg = err instanceof Error ? err.message : 'Failed to load devices'
      toast({ title: 'Error', description: msg, variant: 'destructive' })
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingDevices(false)
      }
    }
  }, [supportedPlatforms, toast])

  const hasPlatforms = supportedPlatforms.length > 0

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current && hasPlatforms) {
      hasFetchedRef.current = true
      fetchDevices()
    }
  }, [isOpen, fetchDevices, hasPlatforms])

  // Abort fetch on unmount or modal close
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort()
    }
  }, [isOpen])

  const handleSelectDevice = (device: Device) => {
    setSelectedDeviceId(getDevicePrimaryId(device))
  }

  const handleConfirm = useCallback(() => {
    if (!selectedDeviceId) return

    const selectedDevice = filteredDevices.find(d =>
      getDevicePrimaryId(d) === selectedDeviceId
    )
    if (!selectedDevice) return

    const agentToolId = getTacticalAgentId(selectedDevice)

    if (!agentToolId) {
      toast({
        title: 'No Tactical Agent',
        description: 'This device has no Tactical RMM agent connected.',
        variant: 'destructive'
      })
      return
    }

    onDeviceSelected({
      agentToolId,
      deviceName: selectedDevice.displayName || selectedDevice.hostname
    })
    onClose()
  }, [selectedDeviceId, filteredDevices, toast, onDeviceSelected, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl h-[90vh] max-h-[900px] flex flex-col">
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <ModalTitle>Select Device</ModalTitle>
          <button
            onClick={onClose}
            className="text-ods-text-secondary hover:text-ods-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </ModalHeader>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Search & Organization Filter */}
        <div className="px-6 py-4 grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-3">
            <Label className="text-ods-text-primary font-semibold text-lg">Search by Device</Label>
            <Input
              startAdornment={<SearchIcon size={20} />}
              placeholder="Search for Devices"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Label className="text-ods-text-primary font-semibold text-lg">Filter by Organization</Label>
            <Autocomplete
              placeholder="Select Organization"
              options={organizationOptions}
              value={selectedOrgIds}
              onChange={setSelectedOrgIds}
              limitTags={2}
            />
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 min-h-0 px-6 pb-4 overflow-y-auto">
          {!hasPlatforms ? (
            <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
              <p className="text-ods-text-secondary">Select at least one supported platform to see available devices.</p>
            </div>
          ) : isLoadingDevices ? (
            <ListLoader />
          ) : filteredDevices.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
              <p className="text-ods-text-secondary">No devices found. Try adjusting your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDevices.map((device) => {
                const id = getDevicePrimaryId(device)
                const deviceType = device.type?.toLowerCase() as DeviceType
                const isSelected = selectedDeviceId === id

                return (
                  <SelectableDeviceCard
                    key={id}
                    title={device.displayName || device.hostname}
                    type={deviceType}
                    subtitle={getDeviceOperatingSystem(device.osType)}
                    selected={isSelected}
                    onSelect={() => handleSelectDevice(device)}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedDeviceId}
        >
          Run Test
        </Button>
      </ModalFooter>
    </Modal>
  )
}
