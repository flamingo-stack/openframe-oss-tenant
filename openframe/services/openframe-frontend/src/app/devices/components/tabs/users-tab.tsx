'use client'

import React from 'react'
import { InfoCard, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@flamingo-stack/openframe-frontend-core'
import { Info as InfoIcon } from 'lucide-react'
import { Device } from '../../types/device.types'

interface UsersTabProps {
  device: Device | null
}

export function UsersTab({ device }: UsersTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    )
  }

  const users = device.users || []
  const loggedInUser = users.find(u => u.isLoggedIn) || users[0]
  const loggedUsername = loggedInUser?.username || device.logged_in_username || device.logged_username || 'Unknown'

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-6 mt-6">
      {/* Logged In User */}
      <div>
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          CURRENTLY LOGGED IN
        </h3>
        <InfoCard
          data={{
            title: loggedUsername,
            subtitle: "Active Session",
            icon: (
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[500px] min-w-[400px]">
                  <p>Currently logged in user from Fleet MDM and Tactical RMM. Shows the active user session with UID, group membership, and shell information.</p>
                </TooltipContent>
              </Tooltip>
            ),
            items: (() => {
              const items = []
              if (loggedInUser?.uid !== undefined) {
                items.push({ label: 'UID', value: loggedInUser.uid.toString() })
              }
              if (loggedInUser?.groupname) {
                items.push({ label: 'Group', value: loggedInUser.groupname })
              }
              if (loggedInUser?.shell) {
                items.push({ label: 'Shell', value: loggedInUser.shell })
              }
              return items.length > 0 ? items : [{ label: 'Status', value: 'Logged In' }]
            })()
          }}
        />
      </div>

      {/* All System Users */}
      {users.length > 1 && (
        <div>
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            ALL SYSTEM USERS ({users.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {users.map((user, index) => {
              const items = []

              if (user.uid !== undefined) {
                items.push({ label: 'UID', value: user.uid.toString() })
              }

              if (user.groupname) {
                items.push({ label: 'Group', value: user.groupname })
              }

              if (user.shell) {
                items.push({ label: 'Shell', value: user.shell })
              }

              if (user.type) {
                items.push({ label: 'Type', value: user.type })
              }

              return (
                <InfoCard
                  key={index}
                  data={{
                    title: user.username,
                    subtitle: user.isLoggedIn ? '● Active' :
                             user.type === 'person' ? 'User Account' :
                             user.type || 'System User',
                    icon: (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[500px] min-w-[400px]">
                          <p>System user account from Fleet MDM. Shows user type (person or service), UID, group, and shell information for access control monitoring.</p>
                        </TooltipContent>
                      </Tooltip>
                    ),
                    items: items.length > 0 ? items : [{ label: 'Username', value: user.username }]
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  )
}
