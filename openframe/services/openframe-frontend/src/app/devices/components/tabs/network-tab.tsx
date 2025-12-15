'use client'

import React from 'react'
import { InfoCard, Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@flamingo-stack/openframe-frontend-core'
import { Info as InfoIcon } from 'lucide-react'

interface NetworkTabProps {
  device: any
}

export function NetworkTab({ device }: NetworkTabProps) {
  // Separate IPs and preserve Fleet MDM primary_ip at top
  const allIps = device?.local_ips || []
  const fleetPrimaryIP = device?.primary_ip // Fleet MDM primary IP
  const ipv4Addresses: string[] = []
  const ipv6Addresses: string[] = []

  allIps.forEach((ip: string) => {
    if (ip.includes(':')) {
      ipv6Addresses.push(ip)
    } else {
      ipv4Addresses.push(ip)
    }
  })

  // Keep Fleet primary IP at top, sort the rest
  if (fleetPrimaryIP && ipv4Addresses.length > 0) {
    const primaryIndex = ipv4Addresses.indexOf(fleetPrimaryIP)
    if (primaryIndex > -1) {
      // Remove primary IP from list
      ipv4Addresses.splice(primaryIndex, 1)
      // Sort remaining IPs numerically
      ipv4Addresses.sort((a, b) => {
        const aParts = a.split(/[./]/).map(Number)
        const bParts = b.split(/[./]/).map(Number)
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
        }
        return 0
      })
      // Put primary IP back at top
      ipv4Addresses.unshift(fleetPrimaryIP)
    } else {
      // Primary IP not in list, just sort normally
      ipv4Addresses.sort((a, b) => {
        const aParts = a.split(/[./]/).map(Number)
        const bParts = b.split(/[./]/).map(Number)
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
        }
        return 0
      })
    }
  } else {
    // No Fleet primary IP, sort normally
    ipv4Addresses.sort((a, b) => {
      const aParts = a.split(/[./]/).map(Number)
      const bParts = b.split(/[./]/).map(Number)
      for (let i = 0; i < 4; i++) {
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
      }
      return 0
    })
  }

  // Sort IPv6 addresses (lexicographically for now)
  ipv6Addresses.sort()

  return (
    <TooltipProvider delayDuration={0}>
    <div className="space-y-4 mt-6">
      <InfoCard
        data={{
          title: "Public IP",
          icon: (
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[500px] min-w-[400px]">
                <p>Public internet-facing IP address from Fleet MDM. This is the external IP used for internet communication, useful for network troubleshooting and remote access configuration.</p>
              </TooltipContent>
            </Tooltip>
          ),
          items: [
            { label: 'IP Address', value: device?.public_ip || 'Unknown', copyable: true }
          ]
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ipv4Addresses.length > 0 && (
          <InfoCard
            data={{
              title: "Local IPv4 Addresses",
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Local network IPv4 addresses from Fleet MDM. Shows all private network IPs assigned to device interfaces for local network communication.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                {  value: ipv4Addresses, copyable: true }
              ]
            }}
          />
        )}
        {ipv6Addresses.length > 0 && (
          <InfoCard
            data={{
              title: "Local IPv6 Addresses",
              icon: (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[500px] min-w-[400px]">
                    <p>Local network IPv6 addresses from Fleet MDM. Shows modern IPv6 addresses assigned to device interfaces for next-generation network communication.</p>
                  </TooltipContent>
                </Tooltip>
              ),
              items: [
                { value: ipv6Addresses, copyable: true }
              ]
            }}
          />
        )}
      </div>
    </div>
    </TooltipProvider>
  )
}
