'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

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
    <div className="space-y-4 mt-6">
      <InfoCard
        data={{
          title: "Public IP",
          items: [
            { label: 'IP Address', value: device?.public_ip || 'Unknown', copyable: true }
          ]
        }}
      />
      {ipv4Addresses.length > 0 && (
        <InfoCard
          data={{
            title: "Local IPv4 Addresses",
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
            items: [
              { value: ipv6Addresses, copyable: true }
            ]
          }}
        />
      )}
    </div>
  )
}
