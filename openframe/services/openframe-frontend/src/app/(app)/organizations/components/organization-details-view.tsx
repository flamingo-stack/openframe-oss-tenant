'use client';

import {
  LoadError,
  NotFoundError,
  type PageActionButton,
  PageLayout,
  TabContent,
  TabNavigation,
} from '@flamingo-stack/openframe-frontend-core';
import {
  BoxArchiveIcon,
  Loading01Icon,
  PenEditIcon,
  Refresh01RightIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { useOrganizationArchive } from '../hooks/use-organization-archive';
import { organizationDetailsQueryKeys, useOrganizationDetails } from '../hooks/use-organization-details';
import { organizationsQueryKeys } from '../hooks/use-organizations';
import { ArchiveOrganizationModal } from './archive-organization-modal';
import { getOrganizationTabComponent, ORGANIZATION_TABS } from './details-tabs/organization-tabs';
import { OrganizationDetailsSkeleton } from './organization-details-skeleton';
import { RestoreOrganizationModal } from './restore-organization-modal';

interface OrganizationDetailsViewProps {
  id: string;
}

const TAB_IDS = ['devices', 'tickets', 'logs', 'details'] as const;

export function OrganizationDetailsView({ id }: OrganizationDetailsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'devices';
  const activeTab = (TAB_IDS as readonly string[]).includes(requestedTab) ? requestedTab : 'devices';

  // Controlled mode for TabNavigation: derive activeTab from URL directly.
  // This avoids a flicker bug in TabNavigation's `urlSync` mode where its
  // internal URL-sync effect fires after an urgent state update but before
  // `router.replace` has propagated, briefly resetting the active tab to the
  // URL's previous value.
  const handleTabChange = useCallback(
    (tabId: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const { organization, isLoading, error } = useOrganizationDetails(id);
  const { checkCanArchive, archiveOrganization, restoreOrganization } = useOrganizationArchive();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isArchived = organization?.status === 'ARCHIVED';

  const handleBack = useCallback(
    () => router.push(isArchived ? '/organizations?tab=archived' : '/organizations'),
    [router, isArchived],
  );
  const handleEdit = useCallback(() => router.push(`/organizations/edit/${id}`), [router, id]);

  const handleArchiveClick = useCallback(async () => {
    if (!organization) return;
    setIsChecking(true);
    try {
      const result = await checkCanArchive(organization.organizationId);
      setCanArchive(result);
      setArchiveModalOpen(true);
    } catch {
      setCanArchive(false);
      setArchiveModalOpen(true);
    } finally {
      setIsChecking(false);
    }
  }, [organization, checkCanArchive]);

  const handleArchiveConfirm = useCallback(async () => {
    if (!organization) return;
    setIsPending(true);
    try {
      await archiveOrganization(organization.organizationId);
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: organizationDetailsQueryKeys.detail(id) });
      toast({ title: 'Organization archived', description: `${organization.name} was archived` });
      router.push('/organizations?tab=archived');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to archive organization';
      toast({ title: 'Archive failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  }, [organization, archiveOrganization, queryClient, id, toast, router]);

  const handleRestoreConfirm = useCallback(async () => {
    if (!organization) return;
    setIsPending(true);
    try {
      await restoreOrganization(organization.organizationId);
      await queryClient.invalidateQueries({ queryKey: organizationsQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: organizationDetailsQueryKeys.detail(id) });
      toast({ title: 'Organization restored', description: `${organization.name} was restored` });
      router.push('/organizations');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to restore organization';
      toast({ title: 'Restore failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  }, [organization, restoreOrganization, queryClient, id, toast, router]);

  const actions = useMemo<PageActionButton[]>(() => {
    if (!organization) return [];
    const archiveAction: PageActionButton = isArchived
      ? {
          label: 'Restore Organization',
          variant: 'card',
          icon: <Refresh01RightIcon className="w-5 h-5 text-ods-text-secondary" />,
          onClick: () => setRestoreModalOpen(true),
          disabled: organization.isDefault,
        }
      : {
          label: 'Archive Organization',
          variant: 'card',
          icon: isChecking ? (
            <Loading01Icon className="w-5 h-5 animate-spin" />
          ) : (
            <BoxArchiveIcon className="w-5 h-5 text-ods-text-secondary" />
          ),
          onClick: handleArchiveClick,
          disabled: organization.isDefault || isChecking,
          loading: isChecking,
        };

    const editAction: PageActionButton = {
      label: 'Edit Organization',
      variant: 'card',
      icon: <PenEditIcon className="w-5 h-5 text-ods-text-secondary" />,
      onClick: handleEdit,
    };

    return [archiveAction, editAction];
  }, [organization, isArchived, isChecking, handleArchiveClick, handleEdit]);

  if (isLoading) {
    return <OrganizationDetailsSkeleton activeTab={activeTab} />;
  }

  if (error) {
    return <LoadError message={`Error loading organization: ${error}`} />;
  }

  if (!organization) {
    return <NotFoundError message="Organization not found" />;
  }

  const subtitleParts = [organization.website, organization.industry].filter(p => p && p !== '-');
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined;

  const logoSrc = featureFlags.organizationImages.displayEnabled() ? getFullImageUrl(organization.imageUrl) : undefined;

  return (
    <>
      <PageLayout
        title={organization.name || 'Organization'}
        subtitle={subtitle}
        image={{ src: logoSrc || '', alt: organization.name || 'Organization' }}
        className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
        backButton={{
          label: isArchived ? 'Back to Archived Organizations' : 'Back to Organizations',
          onClick: handleBack,
        }}
        actions={actions}
        contentClassName="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] md:px-0 md:pb-0"
        headerVariant="card"
      >
        <TabNavigation tabs={ORGANIZATION_TABS} activeTab={activeTab} onTabChange={handleTabChange} showRightGradient>
          {activeTab => (
            <TabContent
              activeTab={activeTab}
              TabComponent={getOrganizationTabComponent(activeTab)}
              componentProps={{ organization }}
            />
          )}
        </TabNavigation>
      </PageLayout>

      <ArchiveOrganizationModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        canArchive={canArchive}
        onConfirm={handleArchiveConfirm}
        isPending={isPending}
      />

      <RestoreOrganizationModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        onConfirm={handleRestoreConfirm}
        isPending={isPending}
      />
    </>
  );
}
