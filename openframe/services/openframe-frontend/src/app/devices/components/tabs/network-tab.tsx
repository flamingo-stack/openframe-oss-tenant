'use client'

import React from 'react'
import { InfoCard } from '@flamingo/ui-kit'

interface NetworkTabProps {
  device: any
}

export function NetworkTab({ device }: NetworkTabProps) {
  // Separate and sort IPs
  const allIps = device?.local_ips || []
  const ipv4Addresses: string[] = []
  const ipv6Addresses: string[] = []

  allIps.forEach((ip: string) => {
    if (ip.includes(':')) {
      ipv6Addresses.push(ip)
    } else {
      ipv4Addresses.push(ip)
    }
  })

  // Sort IPv4 addresses numerically
  ipv4Addresses.sort((a, b) => {
    const aParts = a.split(/[./]/).map(Number)
    const bParts = b.split(/[./]/).map(Number)
    for (let i = 0; i < 4; i++) {
      if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i]
    }
    return 0
  })

  // Sort IPv6 addresses (lexicographically for now)
  ipv6Addresses.sort()

  return (
    <div className="space-y-4">
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
