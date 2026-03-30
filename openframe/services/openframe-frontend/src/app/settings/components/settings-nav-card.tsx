'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface SettingsNavCardProps {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
}

export function SettingsNavCard({ href, icon, title, description }: SettingsNavCardProps) {
  return (
    <Link
      href={href}
      className="bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-m)] flex gap-[var(--spacing-system-s)] items-center"
    >
      <div className="shrink-0 rounded bg-ods-bg border border-ods-border flex items-center justify-center text-ods-text-secondary  p-[var(--spacing-system-sf)]">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-h3 text-ods-text-primary">{title}</p>
        <p className="text-h6 text-ods-text-secondary">{description}</p>
      </div>
      <div className="shrink-0 bg-ods-card border border-ods-border rounded-md p-[var(--spacing-system-sf)]">
        <ChevronRight className="size-6 text-ods-text-primary" />
      </div>
    </Link>
  );
}
