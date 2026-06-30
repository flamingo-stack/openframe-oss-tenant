'use client';

import { Tag } from '@flamingo-stack/openframe-frontend-core';
import type { Device } from '../types/device.types';

interface DeviceTagsSectionProps {
  device: Device;
}

/**
 * "Device Tags" section for the device Overview tab — renders the device's
 * key:value tags as chips. Hidden entirely when the device has no tags.
 */
export function DeviceTagsSection({ device }: DeviceTagsSectionProps) {
  const tagValues = device.tags?.flatMap(tag =>
    tag.values.map(value => ({ id: `${tag.tagId}-${value}`, key: tag.key, value })),
  );

  if (!tagValues || tagValues.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-s)]">
      <p className="text-ods-text-secondary text-h5">Device Tags</p>
      <div className="flex gap-2 items-center flex-wrap">
        {tagValues.map(tag => (
          // `badge` is the DS tag-badge skin (ods-card + border, mono uppercase); the string
          // label gives a native `title` tooltip on hover, so no extra Tooltip plumbing needed.
          <Tag key={tag.id} as="span" variant="badge" label={`${tag.key}:${tag.value}`} />
        ))}
      </div>
    </div>
  );
}
