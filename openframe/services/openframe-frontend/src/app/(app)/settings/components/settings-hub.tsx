'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import {
  CreditCardIcon,
  Hierarchy02Icon,
  Logout01Icon,
  PasscodeIcon,
  PiggyBankIcon,
  ShieldCheckIcon,
  ShieldKeyholeIcon,
  UsersGroupIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { useLogoutConfirmStore } from '@/app/(auth)/auth/stores/logout-confirm-store';
import { apiClient } from '@/lib/api-client';
import { isOssTenantMode } from '@/lib/app-mode';
import { authApiClient } from '@/lib/auth-api-client';
import { featureFlags } from '@/lib/feature-flags';
import { handleApiError } from '@/lib/handle-api-error';
import { routes } from '@/lib/routes';
import { AccountSettingsCard } from './account-settings-card';
import { EditProfileModal } from './edit-profile-modal';
import { EmailVerificationBanner } from './email-verification-banner';
import { EmailVerificationModal } from './email-verification-modal';
import { SettingMenuItem } from './setting-menu-item';

const SETTINGS_NAV_ITEMS = [
  {
    href: routes.settings.billingUsage,
    icon: PiggyBankIcon,
    title: 'Billing & Usage',
    description: 'Subscription details, usage data, and payment settings',
  },
  {
    href: routes.settings.aiSettings(),
    icon: ShieldCheckIcon,
    title: 'AI Settings & Guardrails',
    description: 'Configure AI assistant model and safety policies',
  },
  {
    href: routes.settings.architecture,
    icon: Hierarchy02Icon,
    title: 'Architecture Overview',
    description: 'Configure system architecture and infrastructure settings',
  },
  {
    href: routes.settings.employees,
    icon: UsersGroupIcon,
    title: 'Employees',
    description: 'Manage employee accounts, roles, and permissions',
  },
  {
    href: routes.settings.apiKeys,
    icon: ShieldKeyholeIcon,
    title: 'API Keys Management',
    description: 'Generate and manage API access tokens',
  },
  {
    href: routes.settings.sso,
    icon: PasscodeIcon,
    title: 'SSO Configuration',
    description: 'Set up single sign-on providers and authentication',
  },
] as const;

export function SettingsHub() {
  const { toast } = useToast();
  const openLogoutConfirm = useLogoutConfirmStore(state => state.open);
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const fetchFullProfile = useAuthStore(state => state.fetchFullProfile);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const updateProfile = useCallback(
    async (data: { firstName: string; lastName: string }) => {
      if (!user?.id) return;

      setIsUpdating(true);
      try {
        const res = await apiClient.put(`api/users/${encodeURIComponent(user.id)}`, data);
        if (!res.ok) {
          throw new Error(res.error || 'Failed to update profile');
        }

        const updatedData = res.data;

        updateUser({
          firstName: updatedData.firstName,
          lastName: updatedData.lastName,
        });

        toast({
          title: 'Profile Updated',
          description: 'Your profile has been updated successfully.',
          variant: 'success',
          duration: 3000,
        });

        setIsEditModalOpen(false);
      } catch (error) {
        handleApiError(error, toast, 'Failed to update profile');
      } finally {
        setIsUpdating(false);
      }
    },
    [user?.id, updateUser, toast],
  );

  const handleResendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const response = await authApiClient.resendVerificationEmail(user?.email || '');

      if (!response.ok) {
        throw new Error(response.error || 'Failed to send verification email');
      }

      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox and follow the link to verify your email.',
        variant: 'success',
        duration: 5000,
      });
    } catch (error) {
      handleApiError(error, toast, 'Failed to send verification email');
    } finally {
      setIsSendingVerification(false);
    }
  };

  useEffect(() => {
    fetchFullProfile();
  }, [fetchFullProfile]);

  return (
    <PageLayout
      title="Settings"
      className="min-h-full px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="gap-[var(--spacing-system-l)] lg:gap-[var(--spacing-system-xl)]"
    >
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        {/* Organization + Profile */}
        <AccountSettingsCard
          onEditProfile={() => setIsEditModalOpen(true)}
          onVerifyEmail={() => setIsVerificationModalOpen(true)}
        />

        {user?.emailVerified === false && <EmailVerificationBanner onResend={() => setIsVerificationModalOpen(true)} />}
      </div>

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-system-m)]">
        {SETTINGS_NAV_ITEMS.filter(
          item => item.href !== routes.settings.billingUsage || featureFlags.subscription.enabled(),
        )
          .filter(item => item.href !== routes.settings.architecture || isOssTenantMode())
          .map(item => (
            <SettingMenuItem
              key={item.href}
              href={item.href}
              icon={<item.icon size={24} />}
              title={item.title}
              description={item.description}
            />
          ))}
      </div>

      {/* Log Out — pinned to the bottom-left of the page */}
      <div className="mt-auto">
        <Button variant="outline" onClick={openLogoutConfirm} leftIcon={<Logout01Icon className="text-ods-error" />}>
          Log Out
        </Button>
      </div>

      {/* Modals */}
      {user && (
        <>
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onSave={updateProfile}
            isSaving={isUpdating}
          />
          <EmailVerificationModal
            open={isVerificationModalOpen}
            onOpenChange={setIsVerificationModalOpen}
            userEmail={user.email}
            onSubmit={handleResendVerification}
            isSending={isSendingVerification}
          />
        </>
      )}
    </PageLayout>
  );
}
