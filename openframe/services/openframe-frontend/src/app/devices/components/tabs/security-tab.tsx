'use client'

import React from 'react'
import { InfoCard, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@flamingo-stack/openframe-frontend-core'
import { Info as InfoIcon } from 'lucide-react'

interface SecurityTabProps {
  device: any
}

export function SecurityTab({ device }: SecurityTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    )
  }

  const mdm = device.mdm || {}
  const users = device.users || []

  // Count root users (uid 0)
  const rootUserCount = users.filter((u: any) => u.uid === 0).length

  return (
    <TooltipProvider delayDuration={0}>
      <div className="mt-6">
        {/* Security Posture Section */}
        <div>
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            SECURITY POSTURE
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <InfoCard
              data={{
                title: 'Encryption Status',
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>Device encryption configuration from Fleet MDM. Shows disk encryption status and encryption key availability for data protection.</p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                {
                  label: 'Disk Encryption',
                  value: device.disk_encryption_enabled ? 'Enabled' : 'Disabled'
                },
                {
                  label: 'Encryption Key',
                  value: mdm.encryption_key_available ? 'Available' : 'Not Available'
                }
              ]
            }}
          />

          <InfoCard
            data={{
              title: 'MDM Status',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Mobile Device Management enrollment status from Fleet. Controls remote management capabilities, security policies, and device configuration.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Enrollment',
                  value: mdm.enrollment_status || 'Unknown'
                },
                {
                  label: 'Device Status',
                  value: mdm.device_status || 'Unknown'
                },
                {
                  label: 'Pending Action',
                  value: mdm.pending_action || 'None'
                },
                {
                  label: 'Connected to Fleet',
                  value: mdm.connected_to_fleet ? 'Yes' : 'No'
                }
              ]
            }}
          />

          <InfoCard
            data={{
              title: 'System Security',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>System security status from Tactical RMM. Indicates if security updates require reboot and whether device is in maintenance mode.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Reboot Required',
                  value: device.needs_reboot ? 'Yes' : 'No'
                },
                {
                  label: 'Maintenance Mode',
                  value: device.maintenance_mode ? 'Active' : 'Inactive'
                }
              ]
            }}
          />
        </div>
      </div>

      {/* User Sessions Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          USER SESSIONS
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'Active Users',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>User session information from Fleet and Tactical RMM. Shows currently logged in users and counts of root/administrative accounts for security monitoring.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Current User',
                  value: device.logged_in_username || 'None'
                },
                {
                  label: 'Last Logged In',
                  value: device.last_logged_in_user || 'Unknown'
                },
                {
                  label: 'Root Users',
                  value: rootUserCount.toString()
                },
                {
                  label: 'Total Users',
                  value: users.length.toString()
                }
              ]
            }}
          />
        </div>
      </div>

      {/* Security Agents Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          SECURITY AGENTS
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'OpenFrame Agent',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>OpenFrame monitoring agent. Primary agent for device communication, data collection, and remote management capabilities.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Version',
                  value: device.version || device.agentVersion || 'Unknown'
                },
                {
                  label: 'Last Seen',
                  value: device.last_seen
                    ? new Date(device.last_seen).toLocaleString()
                    : 'Unknown'
                }
              ]
            }}
          />

          <InfoCard
            data={{
              title: 'osquery',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>osquery security agent from Fleet. Provides SQL-powered system monitoring, security analytics, and real-time device telemetry.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Version',
                  value: device.osquery_version || 'Unknown'
                },
                {
                  label: 'Status',
                  value: device.osquery_version ? 'Active' : 'Inactive'
                }
              ]
            }}
          />

          <InfoCard
            data={{
              title: 'Orbit Agent',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Orbit update agent from Fleet. Manages osquery updates, Fleet Desktop, and agent auto-update functionality.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Version',
                  value: device.orbit_version || 'Unknown'
                },
                {
                  label: 'Status',
                  value: device.orbit_version && device.orbit_version !== 'unknown'
                    ? 'Active'
                    : 'Unknown'
                }
              ]
            }}
          />
        </div>
      </div>

      {/* Network Security Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          NETWORK SECURITY
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'Network Interfaces',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Network configuration from Fleet. Shows primary network interface, external IP address, and MAC address for network security monitoring.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Primary IP',
                  value: device.primary_ip || 'Unknown',
                  copyable: true
                },
                {
                  label: 'Public IP',
                  value: device.public_ip || 'Unknown',
                  copyable: true
                },
                {
                  label: 'MAC Address',
                  value: device.primary_mac || device.macAddress || 'Unknown',
                  copyable: true
                }
              ]
            }}
          />
        </div>
      </div>

      {/* Security Alerts Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          ALERT CONFIGURATION
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'Alert Settings',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Alert notification configuration from Tactical RMM. Controls how administrators are notified of security events, offline devices, and system issues.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Email Alerts',
                  value: device.overdue_email_alert ? 'Enabled' : 'Disabled'
                },
                {
                  label: 'Text Alerts',
                  value: device.overdue_text_alert ? 'Enabled' : 'Disabled'
                },
                {
                  label: 'Dashboard Alerts',
                  value: device.overdue_dashboard_alert ? 'Enabled' : 'Disabled'
                },
                {
                  label: 'Alert Template',
                  value: device.alert_template || 'None'
                }
              ]
            }}
          />

          <InfoCard
            data={{
              title: 'Offline Thresholds',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Device offline detection thresholds. Defines how long a device can be unreachable before triggering offline or overdue alerts.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Offline Time',
                  value: device.offline_time ? `${device.offline_time} minutes` : 'Not set'
                },
                {
                  label: 'Overdue Time',
                  value: device.overdue_time ? `${device.overdue_time} minutes` : 'Not set'
                }
              ]
            }}
          />
        </div>
      </div>

      {/* System Boot Information */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          SYSTEM BOOT INFORMATION
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'Boot Times',
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>System boot and uptime information from Fleet. Tracks when the device last started, restarted, and total uptime for availability monitoring.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {
                  label: 'Boot Time',
                  value: device.boot_time
                    ? new Date(device.boot_time * 1000).toLocaleString()
                    : 'Unknown'
                },
                {
                  label: 'Last Restarted',
                  value: device.last_restarted_at
                    ? new Date(device.last_restarted_at).toLocaleString()
                    : 'Unknown'
                },
                {
                  label: 'Uptime',
                  value: device.uptime
                    ? `${Math.floor(device.uptime / 1000000000 / 3600)} hours`
                    : 'Unknown'
                }
              ]
            }}
          />
        </div>
      </div>
      </div>
    </TooltipProvider>
  )
}
