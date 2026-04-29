'use client';

import type { ReactNode } from 'react';

interface OrganizationTabHeaderProps {
  title: string;
  rightActions?: ReactNode;
}

/** Subtitle row inside an organization detail tab — title + optional right-side actions. */
export function OrganizationTabHeader({ title, rightActions }: OrganizationTabHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <h2 className="font-mono font-semibold text-[24px] md:text-[28px] leading-[1.25] tracking-[-0.02em] text-ods-text-primary">
        {title}
      </h2>
      {rightActions && <div className="flex items-center gap-2">{rightActions}</div>}
    </div>
  );
}
