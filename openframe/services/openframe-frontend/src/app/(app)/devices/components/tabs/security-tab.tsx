'use client';

import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ShieldIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { formatDateTime } from '@/lib/format-date';
import type { Device } from '../../types/device.types';
import { TabEmptyState } from './tab-empty-state';

interface SecurityTabProps {
  device: Device | null;
}

/**
 * Status of a single posture row. Drives the value color and the trailing icon,
 * matching the Security design (green check = good, red/amber alert = attention).
 */
type SecurityStatus = 'success' | 'error' | 'warning' | 'neutral';

interface SecurityRow {
  label: string;
  value: string;
  /** Defaults to `neutral` (white value, no trailing icon). */
  status?: SecurityStatus;
}

interface SecurityCard {
  title?: string;
  rows: SecurityRow[];
}

interface SecuritySection {
  id: string;
  title: string;
  cards: SecurityCard[];
}

const VALUE_COLOR: Record<SecurityStatus, string> = {
  success: 'text-ods-success',
  error: 'text-ods-error',
  warning: 'text-ods-warning',
  neutral: 'text-ods-text-primary',
};

function StatusRow({ label, value, status = 'neutral' }: SecurityRow) {
  const icon =
    status === 'success' ? (
      <CheckCircleIcon size={16} className="text-ods-success shrink-0" />
    ) : status === 'error' ? (
      <AlertTriangleIcon size={16} className="text-ods-error shrink-0" />
    ) : status === 'warning' ? (
      <AlertTriangleIcon size={16} className="text-ods-warning shrink-0" />
    ) : null;

  return (
    <div className="flex h-6 items-center gap-[var(--spacing-system-xs)] w-full">
      <span className="text-h4 text-ods-text-secondary whitespace-nowrap">{label}</span>
      <div className="flex-1 h-px bg-ods-divider" />
      <span className={cn('text-h4 truncate', VALUE_COLOR[status])} title={value}>
        {value}
      </span>
      {icon}
    </div>
  );
}

/** Host-local replica of the design's posture card (core `InfoCard` can't color values or add status icons). */
function SecurityStatusCard({ title, rows }: SecurityCard) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-m)] bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)] w-full">
      {title && (
        <span className="text-h4 text-ods-text-primary truncate" title={title}>
          {title}
        </span>
      )}
      <div className="flex flex-col gap-[var(--spacing-system-xs)] w-full">
        {rows.map(row => (
          <StatusRow key={row.label} {...row} />
        ))}
      </div>
    </div>
  );
}

function SecuritySectionBlock({ title, cards }: Omit<SecuritySection, 'id'>) {
  return (
    <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <h3 className="text-h5 text-ods-text-secondary uppercase">{title}</h3>
      <div className={cn('grid grid-cols-1 gap-[var(--spacing-system-l)]', cards.length > 1 && 'lg:grid-cols-3')}>
        {cards.map((card, index) => (
          <SecurityStatusCard key={card.title ?? index} {...card} />
        ))}
      </div>
    </section>
  );
}

/**
 * Build the posture sections from the data we actually have on the normalized device.
 * Sections with no real data are omitted entirely (no "Unknown/N/A" filler), so the
 * design's Firewall / Defender / per-drive BitLocker / SIP blocks simply don't render
 * until the backend surfaces those osquery tables.
 */
function buildSections(device: Device): SecuritySection[] {
  const sections: SecuritySection[] = [];
  const { mdm } = device;

  // Encryption — the BitLocker/FileVault analog we can populate (single boolean + key escrow).
  const encryptionRows: SecurityRow[] = [];
  if (device.disk_encryption_enabled !== undefined) {
    encryptionRows.push({
      label: 'Disk Encryption',
      value: device.disk_encryption_enabled ? 'Encrypted' : 'Not Encrypted',
      status: device.disk_encryption_enabled ? 'success' : 'error',
    });
  }
  if (mdm) {
    encryptionRows.push({
      label: 'Recovery Key Escrow',
      value: mdm.encryption_key_available ? 'Available' : 'Not Available',
      status: mdm.encryption_key_available ? 'success' : 'error',
    });
  }
  if (encryptionRows.length > 0) {
    sections.push({
      id: 'encryption',
      title: 'Encryption',
      cards: [{ title: 'Disk Encryption', rows: encryptionRows }],
    });
  }

  // Device management posture (Fleet MDM enrollment).
  if (mdm) {
    const mdmRows: SecurityRow[] = [
      { label: 'Enrollment', value: mdm.enrollment_status || 'Unknown' },
      { label: 'Device Status', value: mdm.device_status || 'Unknown' },
      { label: 'Pending Action', value: mdm.pending_action || 'None' },
      {
        label: 'Connected to Fleet',
        value: mdm.connected_to_fleet ? 'Yes' : 'No',
        status: mdm.connected_to_fleet ? 'success' : 'error',
      },
    ];
    if (typeof mdm.profiles_count === 'number' && mdm.profiles_count > 0) {
      mdmRows.push({ label: 'Config Profiles', value: String(mdm.profiles_count) });
    }
    if (mdm.dep_profile_error) {
      mdmRows.push({ label: 'DEP Profile', value: 'Error', status: 'error' });
    }
    sections.push({
      id: 'mdm',
      title: 'Device Management',
      cards: [{ title: mdm.name || 'MDM', rows: mdmRows }],
    });
  }

  // Security agents — one card per agent that reports a version.
  const agentCards: SecurityCard[] = [];
  const openframeVersion = device.version || device.agentVersion;
  if (openframeVersion) {
    agentCards.push({
      title: 'OpenFrame Agent',
      rows: [
        { label: 'Version', value: openframeVersion },
        { label: 'Last Seen', value: device.last_seen ? formatDateTime(device.last_seen) : 'Unknown' },
      ],
    });
  }
  if (device.osquery_version) {
    agentCards.push({
      title: 'osquery',
      rows: [
        { label: 'Version', value: device.osquery_version },
        { label: 'Status', value: 'Active', status: 'success' },
      ],
    });
  }
  if (device.orbit_version && device.orbit_version !== 'unknown') {
    agentCards.push({
      title: 'Orbit',
      rows: [
        { label: 'Version', value: device.orbit_version },
        { label: 'Status', value: 'Active', status: 'success' },
      ],
    });
  }
  if (device.fleet_desktop_version) {
    agentCards.push({ title: 'Fleet Desktop', rows: [{ label: 'Version', value: device.fleet_desktop_version }] });
  }
  if (agentCards.length > 0) {
    sections.push({ id: 'agents', title: 'Security Agents', cards: agentCards });
  }

  // Posture — Fleet policy/issue summary (from the host payload `issues`).
  const postureRows: SecurityRow[] = [];
  if (device.failingPoliciesCount !== undefined) {
    postureRows.push({
      label: 'Failing Policies',
      value: String(device.failingPoliciesCount),
      status: device.failingPoliciesCount > 0 ? 'error' : 'success',
    });
  }
  if (device.totalIssuesCount !== undefined) {
    postureRows.push({
      label: 'Total Issues',
      value: String(device.totalIssuesCount),
      status: device.totalIssuesCount > 0 ? 'warning' : 'success',
    });
  }
  if (postureRows.length > 0) {
    sections.push({
      id: 'posture',
      title: 'Posture',
      cards: [{ title: 'Policy Compliance', rows: postureRows }],
    });
  }

  return sections;
}

export function SecurityTab({ device }: SecurityTabProps) {
  if (!device) {
    return (
      <TabEmptyState
        icon={<ShieldIcon />}
        title="No security data found"
        description="Security details for this device will appear here."
      />
    );
  }

  const sections = buildSections(device);

  if (sections.length === 0) {
    return (
      <TabEmptyState
        icon={<ShieldIcon />}
        title="No security data found"
        description="Security details for this device will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      {sections.map(section => (
        <SecuritySectionBlock key={section.id} title={section.title} cards={section.cards} />
      ))}
    </div>
  );
}
