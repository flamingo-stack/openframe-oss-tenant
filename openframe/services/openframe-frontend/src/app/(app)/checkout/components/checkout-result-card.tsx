'use client';

import { Button, Card } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { cn } from '@flamingo-stack/openframe-frontend-core/utils';
import { useRouter } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';

interface CheckoutResultCardProps {
  icon: ComponentType<{ className?: string }>;
  iconWrapperClassName: string;
  title: string;
  description: ReactNode;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}

export function CheckoutResultCard({
  icon: Icon,
  iconWrapperClassName,
  title,
  description,
  primaryCta,
  secondaryCta,
}: CheckoutResultCardProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-[var(--spacing-system-l)] py-[var(--spacing-system-l)]">
      <Card className="flex w-full max-w-md flex-col items-center gap-6 border-ods-border bg-ods-card p-8 text-center">
        <div
          className={cn('flex size-16 items-center justify-center rounded-full', iconWrapperClassName)}
          aria-hidden="true"
        >
          <Icon className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-h2 text-ods-text-primary">{title}</h1>
          <p className="text-h4 text-ods-text-secondary">{description}</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Button variant="accent" className="w-full" onClick={() => router.push(primaryCta.href)}>
            {primaryCta.label}
          </Button>
          {secondaryCta && (
            <Button variant="outline" className="w-full" onClick={() => router.push(secondaryCta.href)}>
              {secondaryCta.label}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
