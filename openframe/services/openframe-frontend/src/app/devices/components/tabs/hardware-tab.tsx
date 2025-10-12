'use client'

import React from 'react'
import { Device } from '../../types/device.types'
import { InfoCard } from '@flamingo/ui-kit'

interface HardwareTabProps {
  device: Device | null
}

export function HardwareTab({ device }: HardwareTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    )
  }

  const parseCpuModel = (cpuArray: string[], device?: Device) => {
    if (!cpuArray || cpuArray.length === 0) return []

    // Use device data for accurate CPU information
    const physicalCores = device?.cpu_physical_cores
    const logicalCores = device?.cpu_logical_cores

    return cpuArray.map(cpu => {
      const items: Array<{ label: string; value: string }> = []

      // Only add cores if we have the data
      if (physicalCores && logicalCores) {
        items.push({
          label: 'Physical Cores',
          value: `${physicalCores}`
        })
        items.push({
          label: 'Logical Cores',
          value: `${logicalCores}`
        })
      } else if (physicalCores) {
        items.push({
          label: 'Cores',
          value: `${physicalCores}`
        })
      }

      // Add CPU type info if available
      if (device?.cpu_type) {
        items.push({
          label: 'Type',
          value: device.cpu_type
        })
      }

      return {
        model: cpu,
        items: items
      }
    })
  }

  const processDiskData = (
    disks: Array<{
      free: string
      used: string
      total: string
      device: string
      fstype: string
      percent: number
    }>,
    physicalDisks: string[]
  ) => {
    if (!disks || disks.length === 0) return []

    // Filter out invalid disks
    const validDisks = disks.filter(disk =>
      disk.total !== '0 B' &&
      disk.device !== 'map auto_home' &&
      disk.percent > 0
    )

    // Extract physical disk number from device path (e.g., /dev/disk3s1 -> disk3)
    const extractPhysicalDisk = (device: string) => {
      const match = device.match(/disk(\d+)/)
      return match ? `disk${match[1]}` : device
    }

    // Group partitions by physical disk
    const groupedByPhysicalDisk = validDisks.reduce((acc, disk) => {
      const physicalDisk = extractPhysicalDisk(disk.device)
      if (!acc[physicalDisk]) {
        acc[physicalDisk] = []
      }
      acc[physicalDisk].push(disk)
      return acc
    }, {} as Record<string, typeof validDisks>)

    // Parse physical disk info to get actual sizes and names
    const physicalDiskInfo = (physicalDisks || []).reduce((acc, diskStr) => {
      const parts = diskStr.trim().split(' ')
      const size = parts[parts.length - 2] + ' ' + parts[parts.length - 1]
      const diskMatch = diskStr.match(/disk(\d+)/)
      if (diskMatch) {
        const diskKey = `disk${diskMatch[1]}`
        acc[diskKey] = {
          size,
          name: diskStr.includes('SSD') ? 'SSD' : 'HDD',
          type: diskStr.includes('SSD') ? 'SSD' : 'HDD',
          exists: true
        }
      }
      return acc
    }, {} as Record<string, any>)

    // Create disk objects for all physical disks (even if no partition data)
    const allDisks = Object.keys(physicalDiskInfo).map(physicalDisk => {
      const partitions = groupedByPhysicalDisk[physicalDisk]
      const diskInfo = physicalDiskInfo[physicalDisk]

      if (partitions && partitions.length > 0) {
        // Has partition data - use the largest partition
        const mainPartition = partitions.reduce((largest, current) => {
          const currentSize = parseFloat(current.total.replace(/[^\d.]/g, ''))
          const largestSize = parseFloat(largest.total.replace(/[^\d.]/g, ''))
          return currentSize > largestSize ? current : largest
        })

        return {
          name: physicalDisk,
          size: diskInfo.size,
          used: mainPartition.used,
          free: mainPartition.free,
          percentage: mainPartition.percent,
          type: diskInfo.type,
          count: partitions.length
        }
      } else {
        // No partition data - show disk with unavailable stats
        return {
          name: physicalDisk,
          size: diskInfo.size,
          used: 'N/A',
          free: 'N/A',
          percentage: 0,
          type: diskInfo.type,
          count: 0
        }
      }
    })

    return allDisks.sort((a, b) => {
      // Parse size strings to numeric values for comparison
      const parseSize = (sizeStr: string): number => {
        const match = sizeStr.match(/([0-9.]+)\s*(GB|MB|TB)/i)
        if (!match) return 0

        const value = parseFloat(match[1])
        const unit = match[2].toUpperCase()

        // Convert everything to GB for comparison
        if (unit === 'TB') return value * 1024
        if (unit === 'MB') return value / 1024
        return value // GB
      }

      const aSize = parseSize(a.size)
      const bSize = parseSize(b.size)

      // Sort by capacity descending (biggest to smallest)
      return bSize - aSize
    })
  }

  // Use cpu_brand as single CPU model, wrapped in array for compatibility
  const cpuModels = parseCpuModel(device.cpu_brand ? [device.cpu_brand] : (device.cpu_model || []), device)

  // Use both disks and physical_disks from device
  const diskData = processDiskData(device.disks || [], device.physical_disks || [])

  const batteries = device.batteries || []

  return (
    <div className="mt-6">
      {/* Disk Info Section */}
      <div>
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          DISK INFO
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {diskData.map((disk, index) => (
              <InfoCard
                key={index}
                data={{
                  title: disk.name,
                  subtitle: disk.count === 0
                    ? `${disk.type} Drive (No partition data)`
                    : `${disk.type} Drive (${disk.count} partition${disk.count > 1 ? 's' : ''})`,
                  items: [
                    {
                      label: 'Current Usage',
                      value: `${disk.percentage}%`
                    },
                    {
                      label: 'Used Space',
                      value: disk.used
                    },
                    {
                      label: 'Free Space',
                      value: disk.free
                    },
                    {
                      label: 'Total Capacity',
                      value: disk.size
                    }
                  ],
                  progress: {
                    value: disk.percentage,
                  }
                }}
              />
          ))}
        </div>
      </div>

      {/* RAM Info Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          RAM INFO
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard
            data={{
              title: 'System Memory',
              subtitle: 'RAM',
              items: [
                  {
                    label: 'Total Memory',
                    value: device.totalRam || 'Unknown'
                  }
              ],
            }}
          />
        </div>
      </div>

      {/* CPU Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
          CPU
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {cpuModels.slice(0, 4).map((cpu, index) => (
            <InfoCard
              key={index}
              data={{
                title: cpu.model,
                subtitle: cpu.items.length > 0 ? undefined : 'No detailed information available',
                items: cpu.items.length > 0 ? cpu.items : [
                  {
                    label: 'Status',
                    value: 'Basic info only'
                  }
                ]
              }}
            />
          ))}
        </div>
      </div>

      {/* Battery Health Section (macOS) */}
      {batteries.length > 0 && (
        <div className="pt-6">
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            BATTERY HEALTH
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {batteries.map((battery, index) => {
              const healthStatus = battery.health || 'Unknown'
              const cycleCount = battery.cycle_count || 0

              // Parse health percentage - Fleet returns it as a string like "Normal (99%)"
              let healthPercentage = 0
              const percentMatch = healthStatus.match(/\((\d+)%\)/)
              if (percentMatch) {
                healthPercentage = parseInt(percentMatch[1])
              } else {
                // Fallback to text-based parsing
                const healthLower = healthStatus.toLowerCase()
                if (healthLower.includes('normal') || healthLower.includes('good')) {
                  healthPercentage = 100
                } else if (healthLower.includes('fair')) {
                  healthPercentage = 60
                } else if (healthLower.includes('poor')) {
                  healthPercentage = 30
                }
              }

              return (
                <InfoCard
                  key={index}
                  data={{
                    title: `Battery ${index + 1}`,
                    subtitle: healthStatus,
                    items: [
                      {
                        label: 'Cycle Count',
                        value: cycleCount.toString()
                      },
                      {
                        label: 'Health',
                        value: `${healthPercentage}%`
                      }
                    ],
                    progress: {
                      value: healthPercentage,
                      warningThreshold: 60,
                      criticalThreshold: 80,
                      inverted: true  // High values = good (green), low values = bad (red)
                    }
                  }}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
