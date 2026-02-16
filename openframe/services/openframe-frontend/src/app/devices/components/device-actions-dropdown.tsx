'use client'

import React, { useState, useMemo, useCallback } from 'react'
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
  AlertDialogAction,
  Modal,
  ModalHeader,
  ModalTitle
} from '@flamingo-stack/openframe-frontend-core'
import {
  ShellIcon,
  RemoteControlIcon,
  ScriptIcon,
  ArchiveIcon,
  CmdIcon,
  PowerShellIcon
} from '@flamingo-stack/openframe-frontend-core/components/icons'
import { CommandBox } from '@flamingo-stack/openframe-frontend-core/components/features'
import { normalizeOSType } from '@flamingo-stack/openframe-frontend-core'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { MoreVertical, Trash2, Copy, PackageX, Folder } from 'lucide-react'
import { useDeviceActions } from '../hooks/use-device-actions'
import { useReleaseVersion } from '../hooks/use-release-version'
import { getDeviceActionAvailability } from '../utils/device-action-utils'
import { getDeviceActionButtons, toActionsMenuItem } from '../utils/device-action-config'
import { buildUninstallCommand, normalizeDevicePlatform } from '../utils/device-command-utils'
import type { Device } from '../types/device.types'
import type { ActionsMenuGroup } from '@flamingo-stack/openframe-frontend-core'

interface DeviceActionsDropdownProps {
  device: Device
  context: 'table' | 'detail'
  onActionComplete?: () => void
  // Handlers for actions (used to integrate with parent component modals)
  onRunScript?: () => void
}

export function DeviceActionsDropdown({
  device,
  context,
  onActionComplete,
  onRunScript
}: DeviceActionsDropdownProps) {
  const router = useRouter()
  const { toast } = useToast()
  const { archiveDevice, deleteDevice, isArchiving, isDeleting } = useDeviceActions()

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showUninstallDialog, setShowUninstallDialog] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const { releaseVersion } = useReleaseVersion({ enabled: dropdownOpen })

  const deviceName = device.displayName || device.hostname || 'this device'
  const deviceId = device.machineId || device.id

  // Get device platform for uninstall command
  const devicePlatform = useMemo(() =>
    normalizeDevicePlatform(device.platform, device.osType, device.operating_system),
    [device.platform, device.osType, device.operating_system]
  )

  const uninstallCommand = useMemo(() => {
    if (!dropdownOpen && !showUninstallDialog) return ''
    return buildUninstallCommand({ platform: devicePlatform, releaseVersion })
  }, [devicePlatform, releaseVersion, dropdownOpen, showUninstallDialog])

  // Copy uninstall command to clipboard
  const copyUninstallCommand = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(uninstallCommand)
      toast({
        title: 'Command copied',
        description: 'Uninstall command copied to clipboard'
      })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy command to clipboard',
        variant: 'destructive'
      })
    }
  }, [uninstallCommand, toast])

  // Get unified action availability
  const actionAvailability = useMemo(() =>
    getDeviceActionAvailability(device),
    [device]
  )

  // Check if Windows for shell type selection
  const isWindows = useMemo(() => {
    const osType = device.platform || device.osType || device.operating_system
    return normalizeOSType(osType) === 'WINDOWS'
  }, [device.platform, device.osType, device.operating_system])

  // Action handlers - always use machineId for URL routing
  const handleRemoteControl = () => {
    setDropdownOpen(false)
    if (actionAvailability.meshcentralAgentId) {
      // Simple URL with just the OpenFrame machineId - remote desktop page fetches the rest
      router.push(`/devices/details/${deviceId}/remote-desktop`)
    }
  }

  const handleRunScript = () => {
    setDropdownOpen(false)
    if (onRunScript) {
      onRunScript()
    } else {
      // Navigate to device details with action param to auto-open scripts modal
      router.push(`/devices/details/${deviceId}?action=runScript`)
    }
  }

  const handleRemoteShell = (type: 'cmd' | 'powershell' | 'bash') => {
    setDropdownOpen(false)
    if (actionAvailability.meshcentralAgentId) {
      router.push(`/devices/details/${deviceId}/remote-shell?shellType=${type}`)
    }
  }

  const handleManageFiles = () => {
    setDropdownOpen(false)
    if (actionAvailability.meshcentralAgentId) {
      router.push(`/devices/details/${deviceId}/file-manager`)
    }
  }

  const handleArchive = async () => {
    const success = await archiveDevice(deviceId, deviceName)
    setShowArchiveConfirm(false)
    if (success) {
      if (context === 'detail') {
        // From device detail page - navigate back to devices list
        router.push('/devices')
      } else {
        // From table - just refresh the list, no navigation
        onActionComplete?.()
      }
    }
  }

  const handleDelete = async () => {
    const success = await deleteDevice(deviceId, deviceName)
    setShowDeleteConfirm(false)
    if (success) {
      if (context === 'detail') {
        // From device detail page - navigate back to devices list
        router.push('/devices')
      } else {
        // From table - just refresh the list, no navigation
        onActionComplete?.()
      }
    }
  }

  // Get unified action button configs
  const actionButtons = useMemo(() =>
    getDeviceActionButtons(device, deviceId, isWindows),
    [device, deviceId, isWindows]
  )

  // Build menu groups - different items for table vs detail context
  const menuGroups = useMemo((): ActionsMenuGroup[] => {
    const groups: ActionsMenuGroup[] = []
    const actionItems = []

    // In table context, include all remote actions
    // In detail context, Remote Shell and Remote Control are separate buttons, so exclude them
    if (context === 'table') {
      // Use unified config for action buttons
      actionItems.push(
        toActionsMenuItem(actionButtons.remoteShell, deviceId, {
          onShellSelect: handleRemoteShell,
          onClick: () => handleRemoteShell('bash')
        })
      )

      actionItems.push(
        toActionsMenuItem(actionButtons.remoteControl, deviceId, {
          onClick: handleRemoteControl
        })
      )

      actionItems.push(
        toActionsMenuItem(actionButtons.manageFiles, deviceId, {
          onClick: handleManageFiles
        })
      )
    }

    // Run Script is always in the dropdown
    actionItems.push({
      id: 'run-script',
      label: 'Run Script',
      icon: <ScriptIcon className="w-6 h-6" />,
      disabled: !actionAvailability.runScriptEnabled,
      onClick: handleRunScript
    })

    if (actionItems.length > 0) {
      groups.push({
        items: actionItems,
        separator: true
      })
    }

    // Destructive actions
    const destructiveItems = []

    // Uninstall Device - always available (shows command to run on device)
    destructiveItems.push({
      id: 'uninstall',
      label: 'Uninstall Device',
      icon: <PackageX className="w-6 h-6" />,
      onClick: () => {
        setDropdownOpen(false)
        setShowUninstallDialog(true)
      }
    })

    if (actionAvailability.archiveEnabled) {
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

    if (actionAvailability.deleteEnabled) {
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
  }, [context, isWindows, actionAvailability])

  // Render trigger based on context - both use 3 dots icon
  // Stop propagation to prevent row click from triggering in table context
  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const renderTrigger = () => {
    if (context === 'table') {
      return (
        <Button
          variant="outline"
          centerIcon={<MoreVertical />}
          onClick={handleTriggerClick}
        >
        </Button>
      )
    }

    // Detail context: same 3 dots button style
    return (
      <Button
        variant="device-action"
        centerIcon={<MoreVertical />}
      >
      </Button>
    )
  }

  // Don't render if no actions available
  if (menuGroups.length === 0 || menuGroups.every(g => g.items.length === 0)) {
    return null
  }

  return (
    <div data-no-row-click onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false} open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {renderTrigger()}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0 border-none">
          <ActionsMenu
            groups={menuGroups}
            onItemClick={() => setDropdownOpen(false)}
          />
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
              className="flex-1 border border-error text-error bg-transparent hover:bg-error/10 font-['DM_Sans'] font-bold text-[16px] h-12 rounded-[6px]"
            >
              {isDeleting ? 'Deleting...' : 'Delete Device'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Uninstall Device Modal */}
      <Modal isOpen={showUninstallDialog} onClose={() => setShowUninstallDialog(false)} className="max-w-2xl w-full text-left">
        <ModalHeader>
          <ModalTitle>Uninstall Device</ModalTitle>
          <p className="text-ods-text-secondary text-sm mt-1">
            Run this command on{' '}
            <span className="text-ods-accent font-medium">{deviceName}</span>{' '}
            to uninstall the OpenFrame client.
          </p>
        </ModalHeader>
        <div className="px-6 py-4">
          <CommandBox
            command={uninstallCommand}
            primaryAction={{
              label: 'Copy Command',
              onClick: copyUninstallCommand,
              icon: <Copy className="w-5 h-5" />,
              variant: 'primary'
            }}
          />
        </div>
      </Modal>
    </div>
  )
}
