'use client';

import { ToolBadge } from '@flamingo-stack/openframe-frontend-core/components';
import { Button, DeviceCard, StatusTag } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn, normalizeToolTypeWithFallback } from '@flamingo-stack/openframe-frontend-core/utils';
import { X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { DeviceDetailsButton } from '../../devices/components/device-details-button';
import { useDeviceDetails } from '../../devices/hooks/use-device-details';
import { getDeviceOperatingSystem, getDeviceStatusConfig } from '../../devices/utils/device-status';

interface LogInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: {
    id: string;
    logId: string;
    timestamp: string;
    status: {
      label: string;
      variant?: 'success' | 'warning' | 'error' | 'info' | 'critical';
    };
    source: {
      name: string;
      icon?: React.ReactNode;
    };
    device: {
      name: string;
      organization?: string;
    };
    description: {
      title: string;
      details?: string;
    };
    // Additional details for modal
    user?: string;
    network?: string;
    rawData?: any;
    // Store original LogEntry for API calls
    originalLogEntry?: any;
  } | null;
  fetchLogDetails: (logEntry: any) => Promise<any>;
}

interface DetailedLogData {
  toolEventId: string;
  eventType: string;
  ingestDay: string;
  toolType: string;
  severity: string;
  userId?: string;
  deviceId?: string;
  message?: string;
  timestamp: string;
  details?: string;
}

const InfoField = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">{label}</span>
    <span className="font-['DM_Sans'] font-medium text-[18px] leading-[24px] text-ods-text-primary">{value}</span>
  </div>
);

export function LogInfoModal({ isOpen, onClose, log, fetchLogDetails }: LogInfoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [detailedLogData, setDetailedLogData] = useState<DetailedLogData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Device details hook
  const { deviceDetails, isLoading: isLoadingDevice, fetchDeviceById, clearDeviceDetails } = useDeviceDetails();

  // Fetch device details when modal opens with a deviceId
  // ALWAYS fetch the full device object - log data only has partial info (hostname, org)
  useEffect(() => {
    if (isOpen && log?.originalLogEntry) {
      const deviceId = log.originalLogEntry.deviceId;

      // Always fetch the full device object if we have a deviceId
      if (deviceId && deviceId !== 'null' && deviceId !== '') {
        fetchDeviceById(deviceId);
      }
    }

    // Clear device details when modal closes
    if (!isOpen) {
      clearDeviceDetails();
    }
  }, [isOpen, log?.originalLogEntry, fetchDeviceById, clearDeviceDetails]);

  useEffect(() => {
    if (isOpen && log && log.originalLogEntry) {
      const logEntry = log.originalLogEntry;

      if (
        !logEntry.toolEventId ||
        !logEntry.ingestDay ||
        !logEntry.toolType ||
        !logEntry.eventType ||
        !logEntry.timestamp
      ) {
        console.error('Missing required fields for fetchLogDetails:', {
          toolEventId: logEntry.toolEventId,
          ingestDay: logEntry.ingestDay,
          toolType: logEntry.toolType,
          eventType: logEntry.eventType,
          timestamp: logEntry.timestamp,
        });
        setDetailedLogData(null);
        return;
      }

      setIsLoadingDetails(true);
      setDetailedLogData(null);

      fetchLogDetails(logEntry)
        .then(data => {
          setDetailedLogData(data);
        })
        .catch(error => {
          console.error('Failed to fetch log details:', error);
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    } else {
      setDetailedLogData(null);
    }
  }, [isOpen, log, fetchLogDetails]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !log) return null;

  const rawDataDisplay = detailedLogData?.details
    ? typeof detailedLogData.details === 'object'
      ? JSON.stringify(detailedLogData.details, null, 2)
      : detailedLogData.details
    : log.rawData
      ? JSON.stringify(log.rawData, null, 2)
      : '{}';

  const displayData = detailedLogData || {
    toolEventId: log.logId,
    message: log.description.title,
    details: log.description.details,
    severity: log.status.label,
    toolType: log.source.name,
    userId: log.user,
    deviceId: log.device.name,
    timestamp: log.timestamp,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-[1000] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-[480px] bg-ods-card z-[1001] flex flex-col',
          'transform transition-transform duration-300 ease-in-out',
          'border-l border-ods-border',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-ods-card p-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-['DM_Sans'] font-bold text-[20px] leading-[28px] text-ods-text-primary mb-2">
                {displayData.message || log.description.title}
              </h2>
              <div className="flex items-center gap-2">
                <StatusTag label={displayData.severity || log.status.label} variant={log.status.variant} />
                <span className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                  {displayData.timestamp || log.timestamp}
                </span>
                {isLoadingDetails && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-ods-border border-t-ods-accent rounded-full animate-spin" />
                    <span className="text-[12px] text-ods-text-secondary">Loading details...</span>
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-ods-bg-hover h-8 w-8">
              <X className="h-4 w-4 text-ods-text-secondary" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex-1 p-4 space-y-6 overflow-y-auto min-h-0">
            {/* Description */}
            {(displayData.message || log.description.details) && (
              <p className="font-['DM_Sans'] font-medium text-[14px] leading-[20px] text-ods-text-secondary">
                {displayData.message || log.description.details}
              </p>
            )}

            {/* Log Details Section */}
            <div className="p-4 bg-ods-card border border-ods-border rounded-[6px] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Log ID" value={displayData.toolEventId || log.logId} />
                <InfoField label="User" value={displayData.userId || log.user} />
                <InfoField
                  label="Source"
                  value={<ToolBadge toolType={normalizeToolTypeWithFallback(displayData.toolType)} />}
                />
                <InfoField label="Device" value={displayData.deviceId || log.device.name} />
                {detailedLogData?.eventType && <InfoField label="Event Type" value={detailedLogData.eventType} />}
                {detailedLogData?.ingestDay && <InfoField label="Ingest Day" value={detailedLogData.ingestDay} />}
              </div>
            </div>

            {/* Raw Data Section */}
            <pre className="font-['Azeret_Mono'] text-[12px] leading-[16px] text-ods-text-secondary p-4 bg-ods-bg rounded border border-ods-border whitespace-pre-wrap break-words overflow-wrap-break-word">
              {rawDataDisplay}
            </pre>
          </div>

          {/* Device Card Section */}
          {(() => {
            const deviceId = log?.originalLogEntry?.deviceId;

            // Only show device section if we have a deviceId
            if (!deviceId || deviceId === 'null' || deviceId === '') {
              return null;
            }

            return (
              <div className="p-4 bg-ods-card">
                {isLoadingDevice ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-ods-border border-t-ods-accent rounded-full animate-spin" />
                  </div>
                ) : deviceDetails ? (
                  <DeviceCard
                    device={{
                      id: deviceDetails.id,
                      machineId: deviceDetails.machineId,
                      name: deviceDetails.displayName || deviceDetails.hostname || deviceDetails.description || '',
                      organization: deviceDetails.organization || deviceDetails.machineId,
                      lastSeen: deviceDetails.lastSeen,
                      operatingSystem: getDeviceOperatingSystem(deviceDetails.osType),
                    }}
                    statusBadgeComponent={
                      deviceDetails.status &&
                      (() => {
                        const statusConfig = getDeviceStatusConfig(deviceDetails.status);
                        return <StatusTag label={statusConfig.label} variant={statusConfig.variant} />;
                      })()
                    }
                    actions={{
                      moreButton: {
                        visible: false,
                      },
                      detailsButton: {
                        visible: true,
                        component: (
                          <DeviceDetailsButton
                            deviceId={deviceDetails.id}
                            machineId={deviceDetails.machineId}
                            className="shrink-0"
                          />
                        ),
                      },
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-ods-text-secondary">
                    <p>Device information not available</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </>
  );
}
