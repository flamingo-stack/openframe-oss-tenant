'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  ActionsMenu,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@flamingo/ui-kit'
import {
  ShellIcon,
  RemoteControlIcon,
  ScriptIcon,
  ArchiveIcon,
  CmdIcon,
  PowerShellIcon,
  BashIcon
} from '@flamingo/ui-kit/components/icons'
import { normalizeOSType } from '@flamingo/ui-kit'
import { MoreVertical, Trash2, Ellipsis } from 'lucide-react'
import { useDeviceActions } from '../hooks/use-device-actions'
import type { Device } from '../types/device.types'
import type { ActionsMenuGroup } from '@flamingo/ui-kit'

interface DeviceActionsDropdownProps {
  device: Device
  context: 'table' | 'detail'
  onActionComplete?: () => void
  // Handlers for existing actions (used to integrate with parent component)
  onRemoteControl?: () => void
  onRunScript?: () => void
  onRemoteShell?: (type: 'cmd' | 'powershell' | 'bash') => void
}

export function DeviceActionsDropdown({
  device,
  context,
  onActionComplete,
  onRemoteControl,
  onRunScript,
  onRemoteShell
}: DeviceActionsDropdownProps) {
  const router = useRouter()
  const { archiveDevice, deleteDevice, isArchiving, isDeleting } = useDeviceActions()

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const deviceName = device.displayName || device.hostname || 'this device'
  const deviceId = device.machineId || device.id

  // Check tool connections
  const meshcentralAgentId = useMemo(() =>
    device.toolConnections?.find(tc => tc.toolType === 'MESHCENTRAL')?.agentToolId,
    [device.toolConnections]
  )

  const tacticalAgentId = useMemo(() =>
    device.toolConnections?.find(tc => tc.toolType === 'TACTICAL_RMM')?.agentToolId,
    [device.toolConnections]
  )

  // Check if device is online
  const isOnline = device.status === 'ONLINE'

  // Check if Windows for shell type selection
  const isWindows = useMemo(() => {
    const osType = device.platform || device.osType || device.operating_system
    return normalizeOSType(osType) === 'WINDOWS'
  }, [device.platform, device.osType, device.operating_system])

  // Action handlers
  const handleRemoteControl = () => {
    setDropdownOpen(false)
    if (onRemoteControl) {
      onRemoteControl()
    } else if (meshcentralAgentId) {
      // Navigate to remote desktop
      const deviceData = {
        id: device.id,
        meshcentralAgentId,
        hostname: device.hostname,
        organization: device.organization,
      }
      const url = `/devices/details/${device.id}/remote-desktop?deviceData=${encodeURIComponent(JSON.stringify(deviceData))}`
      router.push(url)
    }
  }

  const handleRunScript = () => {
    setDropdownOpen(false)
    if (onRunScript) {
      onRunScript()
    }
    // Note: For table context, this would need to open a scripts modal
    // The parent component should handle this via onRunScript prop
  }

  const handleRemoteShell = (type: 'cmd' | 'powershell' | 'bash') => {
    setDropdownOpen(false)
    if (onRemoteShell) {
      onRemoteShell(type)
    }
    // Note: For table context, this would need to navigate to device details
    // or open a shell modal. The parent component should handle this.
  }

  const handleArchive = async () => {
    const success = await archiveDevice(deviceId, deviceName)
    setShowArchiveConfirm(false)
    if (success) {
      if (context === 'detail') {
        router.push('/devices')
      } else {
        onActionComplete?.()
      }
    }
  }

  const handleDelete = async () => {
    const success = await deleteDevice(deviceId, deviceName)
    setShowDeleteConfirm(false)
    if (success) {
      if (context === 'detail') {
        router.push('/devices')
      } else {
        onActionComplete?.()
      }
    }
  }

  // Build menu groups based on context
  const menuGroups = useMemo((): ActionsMenuGroup[] => {
    const groups: ActionsMenuGroup[] = []

    if (context === 'table') {
      // Table context: Include all actions
      const actionItems = []

      // Remote Shell with submenu for Windows
      if (isWindows) {
        actionItems.push({
          id: 'remote-shell',
          label: 'Remote Shell',
          icon: <ShellIcon className="w-6 h-6" />,
          type: 'submenu' as const,
          disabled: !meshcentralAgentId || !isOnline,
          submenu: [
            {
              id: 'cmd',
              label: 'CMD',
              icon: <CmdIcon className="w-6 h-6" />,
              onClick: () => handleRemoteShell('cmd')
            },
            {
              id: 'powershell',
              label: 'PowerShell',
              icon: <PowerShellIcon className="w-6 h-6" />,
              onClick: () => handleRemoteShell('powershell')
            }
          ]
        })
      } else {
        // Non-Windows: single shell option
        actionItems.push({
          id: 'remote-shell',
          label: 'Remote Shell',
          icon: <ShellIcon className="w-6 h-6" />,
          disabled: !meshcentralAgentId || !isOnline,
          onClick: () => handleRemoteShell('bash')
        })
      }

      actionItems.push({
        id: 'remote-control',
        label: 'Remote Control',
        icon: <RemoteControlIcon className="w-6 h-6" />,
        disabled: !meshcentralAgentId || !isOnline,
        onClick: handleRemoteControl
      })

      actionItems.push({
        id: 'run-script',
        label: 'Run Script',
        icon: <ScriptIcon className="w-6 h-6" />,
        disabled: !tacticalAgentId || !isOnline,
        onClick: handleRunScript
      })

      groups.push({
        items: actionItems,
        separator: true
      })
    }

    // Archive and Delete actions (both contexts)
    const destructiveItems = []

    if (device.status !== 'ARCHIVED' && device.status !== 'DELETED') {
      destructiveItems.push({
        id: 'archive',
        label: 'Archive Device',
        icon: <ArchiveIcon className="w-6 h-6" />,
        onClick: () => {
          setDropdownOpen(false)
          setShowArchiveConfirm(true)
        }
      })
    }

    if (device.status !== 'DELETED') {
      destructiveItems.push({
        id: 'delete',
        label: 'Delete Device',
        icon: <Trash2 className="w-6 h-6 text-ods-attention-red-error" />,
        onClick: () => {
          setDropdownOpen(false)
          setShowDeleteConfirm(true)
        }
      })
    }

    if (destructiveItems.length > 0) {
      groups.push({
        items: destructiveItems
      })
    }

    return groups
  }, [context, isWindows, meshcentralAgentId, tacticalAgentId, isOnline, device.status])

  // Render trigger based on context
  const renderTrigger = () => {
    if (context === 'table') {
      return (
        <Button
          variant="ghost"
          className="h-12 w-12 p-0 hover:bg-ods-bg-hover"
        >
          <MoreVertical className="h-5 w-5 text-ods-text-secondary" />
        </Button>
      )
    }

    // Detail context: "Actions" button like Remote Shell
    return (
      <Button
        variant="device-action"
        leftIcon={<Ellipsis className="h-6 w-6" />}
      >
        Actions
      </Button>
    )
  }

  // Don't render if no actions available
  if (menuGroups.length === 0 || menuGroups.every(g => g.items.length === 0)) {
    return null
  }

  return (
    <>
      <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0 border-none">
          <ActionsMenu groups={menuGroups} />
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.5px] text-ods-text-primary">
              Archive Device
            </AlertDialogTitle>
            <AlertDialogDescription className="font-['DM_Sans'] text-[16px] leading-[24px] text-ods-text-secondary mt-2">
              Are you sure you want to archive{' '}
              <span className="text-ods-accent font-medium">{deviceName}</span>?
              This device will be hidden from the default view but can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-4 flex-col sm:flex-row">
            <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={isArchiving}
              className="flex-1 bg-ods-accent text-black hover:bg-ods-accent/90 font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]"
            >
              {isArchiving ? 'Archiving...' : 'Archive Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-ods-card border border-ods-border p-8 max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Azeret_Mono'] font-semibold text-[24px] leading-[32px] tracking-[-0.5px] text-ods-text-primary">
              Delete Device
            </AlertDialogTitle>
            <AlertDialogDescription className="font-['DM_Sans'] text-[16px] leading-[24px] text-ods-text-secondary mt-2">
              Are you sure you want to delete{' '}
              <span className="text-ods-attention-red-error font-medium">{deviceName}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-4 flex-col sm:flex-row">
            <AlertDialogCancel className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary hover:bg-ods-bg-hover font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex-1 bg-ods-attention-red-error text-white hover:bg-ods-attention-red-error/90 font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]"
            >
              {isDeleting ? 'Deleting...' : 'Delete Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
