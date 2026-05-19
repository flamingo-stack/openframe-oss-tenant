'use client';

import { OrganizationIcon, OSTypeIcon } from '@flamingo-stack/openframe-frontend-core/components/features';
import { CheckIcon, Copy02Icon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import Link from 'next/link';
import type React from 'react';
import { renderDeviceTypeIcon } from '@/app/components/shared/device-type-icon';
import { InfoCell } from '@/app/components/shared/info-cell';
import { useCopyToClipboard } from '@/app/hooks/use-copy-to-clipboard';
import { splitDateAndTimeWithSeconds } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import type { Device } from '../types/device.types';

function formatDateWithTime(iso?: string): React.ReactNode {
  if (!iso) return 'Unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown';
  const { date, time } = splitDateAndTimeWithSeconds(d);
  return (
    <>
      {date} <span className="text-ods-text-secondary">{time}</span>
    </>
  );
}

interface DeviceInfoSectionProps {
  device: Device | null;
}

export function DeviceInfoSection({ device }: DeviceInfoSectionProps) {
  const { copy: copyUuid, copied: uuidCopied } = useCopyToClipboard({
    successDescription: 'UUID copied to clipboard',
  });

  if (!device) {
    return (
      <div className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-lf)]">
        <div className="text-center text-ods-text-secondary">No device data available</div>
      </div>
    );
  }

  const deviceLabel = [device.manufacturer, device.model].filter(Boolean).join(', ') || 'Unknown';
  const serialNumber = device.serialNumber || device.serial_number || 'Unknown';
  const uuid = device.osUuid || device.machineId || device.id || 'Unknown';
  // TEMP: assigned-user block is hidden until the backend returns a user entity
  const assignedUser = { username: null, imageUrl: null };
  const assignedUserImageUrl = getFullImageUrl(assignedUser?.imageUrl);
  const customerImageUrl = getFullImageUrl(device.organizationImageUrl);
  const customerHref = device.organizationId ? `/customers/details/${device.organizationId}` : undefined;

  // Cells defined once and reused across both responsive layouts below.
  // Icons: 16px on mobile, 24px on tablet+ (matches the responsive design).
  const iconSize = 'w-4 h-4 md:w-6 md:h-6';
  const typeIcon = renderDeviceTypeIcon(device.type, `${iconSize} text-ods-text-secondary`);

  const hostnameCell = <InfoCell value={device.hostname || 'Unknown'} label="Hostname" />;
  const typeCell = <InfoCell value={device.type || 'Unknown'} label="Type" icon={typeIcon} />;
  const deviceCell = (
    <InfoCell
      value={deviceLabel}
      label="Device"
      icon={<OSTypeIcon osType={device.osType || device.platform} size="w-5 h-5 md:w-7 md:h-7" />}
    />
  );
  const serialCell = <InfoCell value={serialNumber} label="Serial Number" />;
  const registeredCell = <InfoCell value={formatDateWithTime(device.registeredAt)} label="Registered" />;
  const updatedCell = <InfoCell value={formatDateWithTime(device.updatedAt || device.lastSeen)} label="Updated" />;

  const customerInner = device.organization && (
    <>
      <OrganizationIcon
        imageUrl={customerImageUrl}
        organizationName={device.organization}
        size="md"
        className="rounded-full overflow-hidden [&_img]:object-cover [&_img]:p-0 [&_img]:w-full [&_img]:h-full"
      />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        {customerHref ? (
          <Link href={customerHref} className="text-ods-accent underline hover:opacity-80 text-h4 truncate">
            {device.organization}
          </Link>
        ) : (
          <p className="text-ods-text-primary text-h4 truncate">{device.organization}</p>
        )}
        <p className="text-ods-text-secondary text-h6 truncate">Customer ID (Site)</p>
      </div>
    </>
  );

  const assignedInner = assignedUser?.username && (
    <>
      <OrganizationIcon
        imageUrl={assignedUserImageUrl}
        organizationName={assignedUser.username}
        size="md"
        className="rounded-full overflow-hidden [&_img]:object-cover [&_img]:p-0 [&_img]:w-full [&_img]:h-full"
      />
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <p className="text-ods-accent underline text-h4 truncate">{assignedUser.username}</p>
        <p className="text-ods-text-secondary text-h6 truncate">Assigned User</p>
      </div>
    </>
  );

  const canCopyUuid = uuid !== 'Unknown';
  const uuidCell = (
    <InfoCell
      value={<span className="break-all">{uuid}</span>}
      label="UUID"
      icon={
        <button
          type="button"
          onClick={() => canCopyUuid && copyUuid(uuid)}
          disabled={!canCopyUuid}
          aria-label="Copy UUID"
          className="shrink-0 text-ods-text-secondary hover:text-ods-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uuidCopied ? <CheckIcon className={`${iconSize} text-ods-accent`} /> : <Copy02Icon className={iconSize} />}
        </button>
      }
    />
  );

  const rowClass =
    'flex items-center gap-[var(--spacing-system-m)] px-[var(--spacing-system-m)] min-h-14 md:min-h-20 border-b border-ods-border';

  return (
    <div className="bg-ods-card border border-ods-border rounded-md flex flex-col">
      {/* ===== Mobile + Tablet (< lg) ===== */}
      <div className="lg:hidden flex flex-col">
        <div className={rowClass}>
          {hostnameCell}
          {typeCell}
        </div>
        <div className={rowClass}>
          {deviceCell}
          {serialCell}
        </div>

        {/* Mobile (< md): customer and assigned each as a full-width row so their
            dividers reach the card edges (no horizontal padding constraining
            the border). */}
        {customerInner && (
          <div className="md:hidden flex items-center gap-[var(--spacing-system-xs)] px-[var(--spacing-system-m)] min-h-14 border-b border-ods-border">
            {customerInner}
          </div>
        )}
        {assignedInner && (
          <div className="md:hidden flex items-center gap-[var(--spacing-system-xs)] px-[var(--spacing-system-m)] min-h-14 border-b border-ods-border">
            {assignedInner}
          </div>
        )}

        {/* Tablet (md to lg): customer + assigned in one horizontal row. */}
        {(customerInner || assignedInner) && (
          <div className="hidden md:flex md:items-center md:gap-[var(--spacing-system-m)] px-[var(--spacing-system-m)] min-h-20 border-b border-ods-border">
            {customerInner && (
              <div className="flex items-center gap-[var(--spacing-system-xs)] flex-1 min-w-0">{customerInner}</div>
            )}
            {assignedInner && (
              <div className="flex items-center gap-[var(--spacing-system-xs)] flex-1 min-w-0">{assignedInner}</div>
            )}
          </div>
        )}

        <div className={rowClass}>
          {registeredCell}
          {updatedCell}
        </div>
        <div className="flex items-center gap-[var(--spacing-system-m)] px-[var(--spacing-system-m)] min-h-14 md:min-h-20">
          {uuidCell}
        </div>
      </div>

      {/* ===== Desktop (lg+) — 4 cells per row ===== */}
      <div className="hidden lg:flex lg:flex-col">
        <div className={rowClass}>
          {hostnameCell}
          {typeCell}
          {deviceCell}
          {serialCell}
        </div>
        <div className={rowClass}>
          {customerInner && (
            <div className="flex items-center gap-[var(--spacing-system-xs)] flex-1 min-w-0">{customerInner}</div>
          )}
          {assignedInner && (
            <div className="flex items-center gap-[var(--spacing-system-xs)] flex-1 min-w-0">{assignedInner}</div>
          )}
          {registeredCell}
          {updatedCell}
        </div>
        <div className="flex items-center gap-[var(--spacing-system-m)] px-[var(--spacing-system-m)] min-h-20">
          {uuidCell}
        </div>
      </div>
    </div>
  );
}
