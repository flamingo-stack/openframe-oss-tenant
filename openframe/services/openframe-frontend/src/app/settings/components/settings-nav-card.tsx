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
      className="bg-ods-card border border-ods-border rounded-md p-4 flex gap-4 items-center hover:border-ods-text-secondary/50 transition-colors"
    >
      <div className="shrink-0 size-12 rounded bg-ods-bg border border-ods-border flex items-center justify-center text-ods-text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-ods-text-primary tracking-tight">{title}</p>
        <p className="text-sm font-medium text-ods-text-secondary">{description}</p>
      </div>
      <div className="shrink-0 bg-ods-card border border-ods-border rounded-md p-3">
        <ChevronRight className="size-6 text-ods-text-primary" />
      </div>
    </Link>
  );
}
