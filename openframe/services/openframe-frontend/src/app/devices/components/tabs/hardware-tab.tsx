'use client';

import {
  InfoCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { Info as InfoIcon } from 'lucide-react';
import React from 'react';
import { Device } from '../../types/device.types';

interface HardwareTabProps {
  device: Device | null;
}

export function HardwareTab({ device }: HardwareTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    );
  }

  const parseCpuModel = (cpuArray: string[], device?: Device) => {
    if (!cpuArray || cpuArray.length === 0) return [];

    // Use device data for accurate CPU information
    const physicalCores = device?.cpu_physical_cores;
    const logicalCores = device?.cpu_logical_cores;

    return cpuArray.map(cpu => {
      const items: Array<{ label: string; value: string }> = [];

      // Only add cores if we have the data
      if (physicalCores && logicalCores) {
        items.push({
          label: 'Physical Cores',
          value: `${physicalCores}`,
        });
        items.push({
          label: 'Logical Cores',
          value: `${logicalCores}`,
        });
      } else if (physicalCores) {
        items.push({
          label: 'Cores',
          value: `${physicalCores}`,
        });
      }

      // Add CPU type info if available
      if (device?.cpu_type) {
        items.push({
          label: 'Type',
          value: device.cpu_type,
        });
      }

      return {
        model: cpu,
        items: items,
      };
    });
  };

  const processDiskData = (
    disks: Array<{
      free: string;
      used: string;
      total: string;
      device: string;
      fstype: string;
      percent: number;
    }>,
    physicalDisks: string[],
  ) => {
    if (!disks || disks.length === 0) return [];

    // Filter out invalid disks
    const validDisks = disks.filter(
      disk => disk.total !== '0 B' && disk.device !== 'map auto_home' && disk.percent > 0,
    );

    const extractPhysicalDisk = (device: string) => {
      // macOS format
      const macMatch = device.match(/disk(\d+)/);
      if (macMatch) {
        return `disk${macMatch[1]}`;
      }

      // Windows drive letter format
      const driveMatch = device.match(/^([A-Z]):/);
      if (driveMatch) {
        return `drive_${driveMatch[1]}`;
      }

      // Fallback: create key from device string
      return `disk_${device.replace(/[^a-zA-Z0-9]/g, '_')}`;
    };

    const groupedByPhysicalDisk = validDisks.reduce(
      (acc, disk) => {
        const physicalDisk = extractPhysicalDisk(disk.device);
        if (!acc[physicalDisk]) {
          acc[physicalDisk] = [];
        }
        acc[physicalDisk].push(disk);
        return acc;
      },
      {} as Record<string, typeof validDisks>,
    );

    const physicalDiskInfo = (physicalDisks || []).reduce(
      (acc, diskStr) => {
        const str = diskStr.trim();

        let diskKey = '';
        let size = '';
        let diskType = 'HDD';
        let diskName = '';

        const macDiskMatch = str.match(/disk(\d+)\s+([\d.]+\s*[KMGT]B)/i);
        if (macDiskMatch) {
          diskKey = `disk${macDiskMatch[1]}`;
          size = macDiskMatch[2];

          if (str.includes('SSD') || str.includes('NVMe')) {
            diskType = 'SSD';
            diskName = 'SSD';
          } else if (str.includes('Virtual')) {
            diskType = 'Virtual';
            diskName = 'Virtual Disk';
          } else {
            diskType = 'HDD';
            diskName = 'HDD';
          }
        } else {
          const sizeMatch = str.match(/([\d.]+\s*[KMGT]B)/i);
          if (sizeMatch) {
            size = sizeMatch[1];
          }

          const driveLetterMatch = str.match(/\b([A-Z]):/i);
          if (driveLetterMatch) {
            diskKey = `drive_${driveLetterMatch[1]}`;
          } else {
            diskKey = `disk_${str.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}`;
          }

          if (str.includes('Virtual')) {
            diskType = 'Virtual';
            diskName = 'Virtual Disk';
          } else if (str.includes('SSD') || str.includes('NVMe')) {
            diskType = 'SSD';
            diskName = 'SSD';
          } else if (str.includes('HDD')) {
            diskType = 'HDD';
            diskName = 'HDD';
          } else {
            if (str.includes('Samsung') || str.includes('Kingston') || str.includes('Crucial')) {
              diskType = 'SSD';
              diskName = 'SSD';
            } else {
              diskType = 'HDD';
              diskName = 'HDD';
            }
          }
        }

        if (diskKey && size) {
          acc[diskKey] = {
            size,
            name: diskName,
            type: diskType,
            exists: true,
            originalString: str,
          };
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    const allPhysicalDiskKeys = Object.keys(physicalDiskInfo);
    const allPartitionKeys = Object.keys(groupedByPhysicalDisk);

    // Combine both sets to ensure we don't miss any disks
    const allDiskKeys = new Set([...allPhysicalDiskKeys, ...allPartitionKeys]);

    const allDisks = Array.from(allDiskKeys)
      .map(diskKey => {
        const partitions = groupedByPhysicalDisk[diskKey];
        const diskInfo = physicalDiskInfo[diskKey];

        if (partitions && partitions.length > 0) {
          // Has partition data - use the largest partition
          const mainPartition = partitions.reduce((largest, current) => {
            const currentSize = parseFloat(current.total.replace(/[^\d.]/g, ''));
            const largestSize = parseFloat(largest.total.replace(/[^\d.]/g, ''));
            return currentSize > largestSize ? current : largest;
          });

          return {
            name: diskInfo?.name || diskKey,
            size: diskInfo?.size || mainPartition.total,
            used: mainPartition.used,
            free: mainPartition.free,
            percentage: mainPartition.percent,
            type: diskInfo?.type || (diskKey.includes('Virtual') ? 'Virtual' : 'Unknown'),
            count: partitions.length,
          };
        } else if (diskInfo) {
          // Has physical disk info but no partition data
          return {
            name: diskInfo.name,
            size: diskInfo.size,
            used: 'N/A',
            free: 'N/A',
            percentage: 0,
            type: diskInfo.type,
            count: 0,
          };
        } else {
          // Partition without matching physical disk info (fallback)
          return {
            name: diskKey,
            size: 'Unknown',
            used: 'N/A',
            free: 'N/A',
            percentage: 0,
            type: 'Unknown',
            count: 0,
          };
        }
      })
      .filter(disk => disk.name && disk.size !== 'Unknown'); // Filter out invalid entries

    return allDisks.sort((a, b) => {
      // Parse size strings to numeric values for comparison
      const parseSize = (sizeStr: string): number => {
        const match = sizeStr.match(/([0-9.]+)\s*(GB|MB|TB)/i);
        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();

        // Convert everything to GB for comparison
        if (unit === 'TB') return value * 1024;
        if (unit === 'MB') return value / 1024;
        return value; // GB
      };

      const aSize = parseSize(a.size);
      const bSize = parseSize(b.size);

      // Sort by capacity descending (biggest to smallest)
      return bSize - aSize;
    });
  };

  // Use cpu_brand as single CPU model, wrapped in array for compatibility
  const cpuModels = parseCpuModel(device.cpu_brand ? [device.cpu_brand] : device.cpu_model || [], device);

  // Use both disks and physical_disks from device
  const diskData = processDiskData(device.disks || [], device.physical_disks || []);

  const batteries = device.batteries || [];

  return (
    <TooltipProvider delayDuration={0}>
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
                  subtitle:
                    disk.count === 0
                      ? `${disk.type} Drive (No partition data)`
                      : `${disk.type} Drive (${disk.count} partition${disk.count > 1 ? 's' : ''})`,
                  icon: (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] min-w-[400px]">
                        <p>
                          Physical storage device information from Fleet MDM. Shows disk usage, capacity, and partition
                          details for monitoring storage health.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                  items: [
                    {
                      label: 'Current Usage',
                      value: `${disk.percentage}%`,
                    },
                    {
                      label: 'Used Space',
                      value: disk.used,
                    },
                    {
                      label: 'Free Space',
                      value: disk.free,
                    },
                    {
                      label: 'Total Capacity',
                      value: disk.size,
                    },
                  ],
                  progress: {
                    value: disk.percentage,
                  },
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
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>
                        Total system memory (RAM) installed on the device from Fleet MDM. Shows the physical memory
                        capacity available for applications and processes.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                  {
                    label: 'Total Memory',
                    value: device.totalRam || 'Unknown',
                  },
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
                  icon: (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] min-w-[400px]">
                        <p>
                          Central Processing Unit (CPU) details from Fleet MDM. Shows processor model, core count, and
                          architecture for performance monitoring.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                  items:
                    cpu.items.length > 0
                      ? cpu.items
                      : [
                          {
                            label: 'Status',
                            value: 'Basic info only',
                          },
                        ],
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
                const healthStatus = battery.health || 'Unknown';
                const cycleCount = battery.cycle_count || 0;

                // Parse health percentage - Fleet returns it as a string like "Normal (99%)"
                let healthPercentage = 0;
                const percentMatch = healthStatus.match(/\((\d+)%\)/);
                if (percentMatch) {
                  healthPercentage = parseInt(percentMatch[1]);
                } else {
                  // Fallback to text-based parsing
                  const healthLower = healthStatus.toLowerCase();
                  if (healthLower.includes('normal') || healthLower.includes('good')) {
                    healthPercentage = 100;
                  } else if (healthLower.includes('fair')) {
                    healthPercentage = 60;
                  } else if (healthLower.includes('poor')) {
                    healthPercentage = 30;
                  }
                }

                return (
                  <InfoCard
                    key={index}
                    data={{
                      title: `Battery ${index + 1}`,
                      subtitle: healthStatus,
                      icon: (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[500px] min-w-[400px]">
                            <p>
                              Battery health information from Fleet MDM (macOS devices only). Shows cycle count, health
                              status, and capacity degradation for battery lifecycle monitoring.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ),
                      items: [
                        {
                          label: 'Cycle Count',
                          value: cycleCount.toString(),
                        },
                        {
                          label: 'Health',
                          value: `${healthPercentage}%`,
                        },
                      ],
                      progress: {
                        value: healthPercentage,
                        warningThreshold: 60,
                        criticalThreshold: 80,
                        inverted: true, // High values = good (green), low values = bad (red)
                      },
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
