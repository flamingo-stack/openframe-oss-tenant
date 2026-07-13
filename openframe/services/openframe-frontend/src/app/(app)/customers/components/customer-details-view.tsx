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
  ArrowRightUpIcon,
  BoxArchiveIcon,
  Loading01Icon,
  PenEditIcon,
  Refresh01RightIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useClientView } from '@/app/(app)/settings/ai-settings/hooks/use-client-view';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { runtimeEnv } from '@/lib/runtime-config';
import { CONTEXT_ENTITY_KIND } from '../../mingo/context/context-types';
import { useTrackOpenView } from '../../mingo/context/use-track-open-view';
import { useCustomerArchive } from '../hooks/use-customer-archive';
import { customerDetailsQueryKeys, useCustomerDetails } from '../hooks/use-customer-details';
import { customersQueryKeys } from '../hooks/use-customers';
import { ArchiveCustomerModal } from './archive-customer-modal';
import { CustomerDetailsSkeleton } from './customer-details-skeleton';
import { getCustomerTabComponent, getCustomerTabs } from './details-tabs/customer-tabs';
import { RestoreCustomerModal } from './restore-customer-modal';

interface CustomerDetailsViewProps {
  id: string;
}

export function CustomerDetailsView({ id }: CustomerDetailsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedTab = searchParams?.get('tab') ?? 'devices';

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

  const { organization, isLoading, error } = useCustomerDetails(id);

  // The Custom AI Assistant tab is gated behind the customer-ai-assistant-settings
  // flag (feature not released yet) and depends on the openframe-saas-ai-agent
  // service (/chat/graphql), so it's saas-tenant only; it appears only when the
  // customer has a custom appearance override (an org-scoped ClientView exists).
  const isCustomerAiEnabled = featureFlags.customerAiAssistantSettings.enabled();
  const isSaasTenant = runtimeEnv.appMode() === 'saas-tenant';
  const { view: clientView } = useClientView(id, { enabled: isCustomerAiEnabled && isSaasTenant && !!id });
  const showCustomAiAssistant = isCustomerAiEnabled && isSaasTenant && !!clientView;
  const tabs = useMemo(() => getCustomerTabs(showCustomAiAssistant), [showCustomAiAssistant]);
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : 'devices';

  // Register this organization as the Mingo "open view".
  useTrackOpenView(
    organization ? { type: CONTEXT_ENTITY_KIND.ORGANIZATION, id, label: organization.name || id } : null,
  );
  const { checkCanArchive, archiveOrganization, restoreOrganization } = useCustomerArchive();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [canArchive, setCanArchive] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const isArchived = organization?.status === 'ARCHIVED';

  const handleBack = useSafeBack(isArchived ? routes.customers.list({ tab: 'archived' }) : routes.customers.list());

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
      await queryClient.invalidateQueries({ queryKey: customersQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: customerDetailsQueryKeys.detail(id) });
      toast({ title: 'Customer archived', description: `${organization.name} was archived` });
      router.push(routes.customers.list({ tab: 'archived' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to archive customer';
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
      await queryClient.invalidateQueries({ queryKey: customersQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: customerDetailsQueryKeys.detail(id) });
      toast({ title: 'Customer restored', description: `${organization.name} was restored` });
      router.push(routes.customers.list());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to restore customer';
      toast({ title: 'Restore failed', description: msg, variant: 'destructive' });
    } finally {
      setIsPending(false);
    }
  }, [organization, restoreOrganization, queryClient, id, toast, router]);

  const actions = useMemo<PageActionButton[]>(() => {
    if (!organization) return [];
    const archiveAction: PageActionButton = isArchived
      ? {
          label: 'Restore Customer',
          variant: 'outline',
          icon: <Refresh01RightIcon className="w-5 h-5 text-ods-text-secondary" />,
          onClick: () => setRestoreModalOpen(true),
          disabled: organization.isDefault,
        }
      : {
          label: 'Archive Customer',
          variant: 'outline',
          icon: isChecking ? (
            <Loading01Icon className="w-5 h-5 animate-spin" />
          ) : (
            <BoxArchiveIcon className="w-5 h-5 text-ods-text-secondary" />
          ),
          onClick: handleArchiveClick,
          disabled: organization.isDefault || isChecking,
          loading: isChecking,
        };

    const editHref = routes.customers.edit(id);
    const editAction: PageActionButton = {
      label: 'Edit Customer',
      variant: 'outline',
      icon: <PenEditIcon className="w-5 h-5 text-ods-text-secondary" />,
      href: editHref,
    };

    return [archiveAction, editAction];
  }, [organization, isArchived, isChecking, handleArchiveClick, id]);

  if (isLoading) {
    return <CustomerDetailsSkeleton activeTab={activeTab} />;
  }

  if (error) {
    return <LoadError message={`Error loading customer: ${error}`} />;
  }

  if (!organization) {
    return <NotFoundError message="Customer not found" />;
  }

  const subtitleParts = [organization.website, organization.industry].filter(p => p && p !== '-');
  const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : undefined;

  const logoSrc = getFullImageUrl(organization.imageUrl, organization.imageHash);

  return (
    <>
      <PageLayout
        title={organization.name || 'Customer'}
        subtitle={subtitle}
        image={{ src: logoSrc || '', alt: organization.name || 'Customer' }}
        className="md:px-[var(--spacing-system-l)] md:pb-[var(--spacing-system-l)]"
        backButton={{
          label: 'Back',
          onClick: handleBack,
        }}
        actions={actions}
        contentClassName="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)] md:px-0 md:pb-0"
        headerVariant="card"
      >
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange}>
          {activeTab => (
            <TabContent
              activeTab={activeTab}
              TabComponent={getCustomerTabComponent(activeTab)}
              componentProps={{ organization }}
            />
          )}
        </TabNavigation>
      </PageLayout>

      <ArchiveCustomerModal
        open={archiveModalOpen}
        onOpenChange={setArchiveModalOpen}
        canArchive={canArchive}
        onConfirm={handleArchiveConfirm}
        isPending={isPending}
      />

      <RestoreCustomerModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        onConfirm={handleRestoreConfirm}
        isPending={isPending}
      />
    </>
  );
}
