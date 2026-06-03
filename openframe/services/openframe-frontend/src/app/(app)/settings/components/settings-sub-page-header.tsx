'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface SettingsSubPageHeaderProps {
  title: string;
}

export function SettingsSubPageHeader({ title }: SettingsSubPageHeaderProps) {
  return (
    <div className="flex items-center gap-4 pt-6 px-6">
      <Link
        href="/settings"
        className="shrink-0 size-10 rounded-md bg-ods-card border border-ods-border flex items-center justify-center text-ods-text-secondary hover:text-ods-text-primary transition-colors"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <h1 className="font-mono font-semibold text-[32px] leading-10 text-ods-text-primary tracking-tight">{title}</h1>
    </div>
  );
}
