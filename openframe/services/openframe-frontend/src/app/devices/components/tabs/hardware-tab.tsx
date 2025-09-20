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

  const parsePhysicalDisks = (disks: string[]) => {
    if (!disks) return []

    return disks.map(disk => {
      const parts = disk.trim().split(' ')
      const size = parts[parts.length - 2] + ' ' + parts[parts.length - 1]
      const name = parts.slice(0, -2).join(' ')
      
      return {
        name: name.replace(/^Apple\s+/, '').replace(/\s+SSD.*$/, ''),
        size: size,
        type: name.includes('SSD') ? 'SSD' : 'HDD'
      }
    })
  }

  const parseCpuModel = (cpuArray: string[]) => {
    if (!cpuArray || cpuArray.length === 0) return []
    return cpuArray.map(cpu => ({
      model: cpu,
      cores: 'Unknown',
      speed: 'Unknown',
      usage: 'Unknown'
    }))
  }

  const processDiskData = (disks: Array<{
    free: string
    used: string
    total: string
    device: string
    fstype: string
    percent: number
  }>) => {
    if (!disks || disks.length === 0) return []
    
    const validDisks = disks.filter(disk => 
      disk.total !== '0 B' && 
      disk.device !== 'map auto_home' && 
      disk.percent > 0
    )
    
    const groupedDisks = validDisks.reduce((acc, disk) => {
      const key = `${disk.total}-${disk.percent}`
      if (!acc[key]) {
        acc[key] = {
          ...disk,
          count: 1,
          device: disk.device
        }
      } else {
        acc[key].count += 1
        acc[key].device += `, ${disk.device}`
      }
      return acc
    }, {} as Record<string, any>)
    
    return Object.values(groupedDisks).map((disk: any) => ({
      name: `Disk ${disk.device.split(',')[0]}`,
      size: disk.total,
      used: disk.used,
      free: disk.free,
      percentage: disk.percent,
      type: disk.fstype === 'apfs' ? 'SSD' : 'HDD',
      count: disk.count
    }))
  }

  const physicalDisks = parsePhysicalDisks(device.physical_disks || [])
  const cpuModels = parseCpuModel(device.cpu_model || [])
  const diskData = processDiskData(device.disks || [])

  return (
    <div className="">
      {/* Disk Info Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          DISK INFO
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {diskData.slice(0, 3).map((disk, index) => {
            const progressColor = disk.percentage > 80 ? 'red' : disk.percentage > 60 ? 'yellow' : 'green'
            
            return (
              <InfoCard
                key={index}
                data={{
                  title: `${disk.name}${index === 0 ? ':' : ''}`,
                  subtitle: `${disk.type} Drive${disk.count > 1 ? ` (${disk.count} partitions)` : ''}`,
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
            )
          })}
        </div>
      </div>

      {/* RAM Info Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
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
                    value: device.totalRam || device.total_ram || 'Unknown'
                  }
              ],
            }}
          />
        </div>
      </div>

      {/* CPU Section */}
      <div className="pt-6">
        <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary">
          CPU
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {cpuModels.slice(0, 4).map((cpu, index) => (
            <InfoCard
              key={index}
              data={{
                title: cpu.model,
                items: [
                  {
                    label: 'Cores',
                    value: cpu.cores
                  },
                  {
                    label: 'Speed',
                    value: cpu.speed
                  },
                  {
                    label: 'Usage',
                    value: cpu.usage
                  }
                ],
                progress: {
                  value: parseInt(cpu.usage) || 0
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
