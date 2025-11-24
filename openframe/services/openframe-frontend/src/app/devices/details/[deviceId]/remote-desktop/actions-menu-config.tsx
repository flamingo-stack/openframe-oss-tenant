import React from 'react'
import { Keyboard, Sunrise, Moon, RotateCcw, Power } from 'lucide-react'
import { ActionsMenuGroup } from '@flamingo/ui-kit'

// Virtual key codes based on Windows Virtual-Key Codes
export const VK = {
  SHIFT: 0x10,
  CONTROL: 0x11,
  ALT: 0x12,
  LWIN: 0x5B,
  M: 0x4D,
  L: 0x4C,
  R: 0x52,
  W: 0x57,
  DOWN: 0x28,
  UP: 0x26
} as const

export interface ActionHandlers {
  sendCtrlAltDel: () => void
  sendKeyCombo: (keys: number[]) => void
  sendPower: (action: 'wake' | 'sleep' | 'reset' | 'poweroff') => void
  setEnableInput: (enabled: boolean) => void
  toast: (options: {
    title: string
    description: string
    variant: 'success' | 'info' | 'destructive'
    duration?: number
  }) => void
}

export const createActionsMenuGroups = (
  handlers: ActionHandlers,
  enableInput: boolean
): ActionsMenuGroup[] => [
  {
    items: [
      {
        id: 'apply-shortcut',
        label: 'Apply Shortcut',
        icon: <Keyboard className="w-6 h-6" />,
        type: 'submenu',
        submenu: [
          {
            id: 'alt-ctrl-del',
            label: 'Alt + Ctrl + Del',
            onClick: () => {
              handlers.sendCtrlAltDel()
            }
          },
          {
            id: 'win-m',
            label: 'Win + M',
            onClick: () => {
              handlers.sendKeyCombo([VK.LWIN, VK.M])
              handlers.toast({
                title: "Win + M",
                description: "Minimize all windows",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'win-down',
            label: 'Win + Down',
            onClick: () => {
              handlers.sendKeyCombo([VK.LWIN, VK.DOWN])
              handlers.toast({
                title: "Win + Down",
                description: "Minimize window",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'win-up',
            label: 'Win + Up',
            onClick: () => {
              handlers.sendKeyCombo([VK.LWIN, VK.UP])
              handlers.toast({
                title: "Win + Up",
                description: "Maximize window",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'shift-win-m',
            label: 'Shift + Win + M',
            onClick: () => {
              handlers.sendKeyCombo([VK.SHIFT, VK.LWIN, VK.M])
              handlers.toast({
                title: "Shift + Win + M",
                description: "Restore minimized windows",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'win-l',
            label: 'Win + L',
            onClick: () => {
              handlers.sendKeyCombo([VK.LWIN, VK.L])
              handlers.toast({
                title: "Win + L",
                description: "Lock workstation",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'win-r',
            label: 'Win + R',
            onClick: () => {
              handlers.sendKeyCombo([VK.LWIN, VK.R])
              handlers.toast({
                title: "Win + R",
                description: "Open Run dialog",
                variant: "success",
                duration: 2000
              })
            }
          },
          {
            id: 'ctrl-w',
            label: 'Ctrl + W',
            onClick: () => {
              handlers.sendKeyCombo([VK.CONTROL, VK.W])
              handlers.toast({
                title: "Ctrl + W",
                description: "Close window",
                variant: "success",
                duration: 2000
              })
            }
          }
        ]
      },
    ],
    separator: true
  },
  {
    items: [
      {
        id: 'wake-up',
        label: 'Wake up',
        icon: <Sunrise className="w-6 h-6" />,
        onClick: () => {
          handlers.sendPower('wake')
        }
      },
      {
        id: 'sleep',
        label: 'Sleep',
        icon: <Moon className="w-6 h-6" />,
        onClick: () => {
          handlers.sendPower('sleep')
        }
      },
      {
        id: 'reboot',
        label: 'Reboot',
        icon: <RotateCcw className="w-6 h-6" />,
        onClick: () => {
          handlers.sendPower('reset')
        }
      },
      {
        id: 'shut-down',
        label: 'Shut Down',
        icon: <Power className="w-6 h-6" />,
        onClick: () => {
          handlers.sendPower('poweroff')
        }
      }
    ],
    separator: true
  },
  {
    items: [
      {
        id: 'enable-input',
        label: 'Enable Input',
        type: 'checkbox',
        checked: enableInput,
        onClick: () => {
          handlers.setEnableInput(!enableInput)
        }
      }
    ]
  }
]