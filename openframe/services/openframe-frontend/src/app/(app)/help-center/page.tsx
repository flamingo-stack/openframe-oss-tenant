'use client';

import {
  BookBookmarkIcon,
  CompassIcon,
  FileContentIcon,
  LifeBuoyIcon,
  QuestionCircleIcon,
  Rocket02Icon,
  RouteArrowIcon,
  ShieldCheckIcon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ComponentType } from 'react';
import { SettingMenuItem } from '../settings/components/setting-menu-item';
import { HELP_CENTER_BASE } from './endpoints';

type Item = {
  href: string;
  title: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
  {
    href: `${HELP_CENTER_BASE}/onboarding-guides`,
    title: 'Onboarding Guides',
    description: 'Step-by-step product walkthroughs.',
    Icon: CompassIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/roadmap`,
    title: 'Development Roadmap',
    description: "What we're building next.",
    Icon: RouteArrowIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/releases`,
    title: 'Product Releases',
    description: 'Version history and release notes.',
    Icon: Rocket02Icon,
  },
  {
    href: `${HELP_CENTER_BASE}/bug-fixes-and-enhancements`,
    title: 'Bug-fixes & Enhancements',
    description: 'Recently shipped fixes and improvements.',
    Icon: WrenchScrewdiverIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/tickets`,
    title: 'Support Tickets',
    description: 'Open and manage your support tickets.',
    Icon: LifeBuoyIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/faqs`,
    title: 'FAQs',
    description: 'Quick answers about OpenFrame and how we work.',
    Icon: QuestionCircleIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/legal/privacy`,
    title: 'Privacy Policy',
    description: 'How we collect, use, and protect your data.',
    Icon: ShieldCheckIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/legal/terms`,
    title: 'Terms of Service',
    description: 'License agreement and acceptable-use terms.',
    Icon: FileContentIcon,
  },
  {
    href: `${HELP_CENTER_BASE}/knowledge-base`,
    title: 'Knowledge Base',
    description: 'Comprehensive guides and references for the OpenFrame platform.',
    Icon: BookBookmarkIcon,
  },
];

// The Help Center index stays a LOCAL page (not extracted to the lib) — it's a
// host-specific landing whose links + icons are app-owned.
export default function HelpCenterPage() {
  return (
    <PageLayout title="Help Center" className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-m)]">
        {ITEMS.map(({ href, title, description, Icon }) => (
          <SettingMenuItem
            key={href}
            href={href}
            title={title}
            description={description}
            icon={<Icon className="size-6" />}
          />
        ))}
      </div>
    </PageLayout>
  );
}
