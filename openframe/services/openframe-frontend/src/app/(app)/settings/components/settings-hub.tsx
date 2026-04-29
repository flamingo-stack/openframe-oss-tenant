'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core';
import {
  CreditCardIcon,
  Hierarchy02Icon,
  PasscodeIcon,
  PiggyBankIcon,
  ShieldCheckIcon,
  ShieldKeyholeIcon,
  UsersGroupIcon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { apiClient } from '@/lib/api-client';
import { authApiClient } from '@/lib/auth-api-client';
import { featureFlags } from '@/lib/feature-flags';
import { handleApiError } from '@/lib/handle-api-error';
import { EditProfileModal } from './edit-profile-modal';
import { EmailVerificationModal } from './email-verification-modal';
import { ProfileCard } from './profile-card';
import { SettingsNavCard } from './settings-nav-card';

const SETTINGS_NAV_ITEMS = [
  {
    href: '/settings/billing-usage',
    icon: PiggyBankIcon,
    title: 'Billing & Usage',
    description: 'Subscription details, usage data, and payment settings',
  },
  {
    href: '/settings/ai-settings',
    icon: ShieldCheckIcon,
    title: 'AI Settings & Guardrails',
    description: 'Configure AI assistant model and safety policies',
  },
  {
    href: '/settings/architecture',
    icon: Hierarchy02Icon,
    title: 'Architecture Overview',
    description: 'Configure system architecture and infrastructure settings',
  },
  {
    href: '/settings/employees',
    icon: UsersGroupIcon,
    title: 'Employees & Permissions',
    description: 'Manage employee accounts, roles, and permissions',
  },
  {
    href: '/settings/api-keys',
    icon: ShieldKeyholeIcon,
    title: 'API Keys Management',
    description: 'Generate and manage API access tokens',
  },
  {
    href: '/settings/sso',
    icon: PasscodeIcon,
    title: 'SSO Configuration',
    description: 'Set up single sign-on providers and authentication',
  },
] as const;

export function SettingsHub() {
  const { toast } = useToast();
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
    <PageLayout title="Settings" className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]">
      {/* Profile Card */}
      <ProfileCard
        onEditProfile={() => setIsEditModalOpen(true)}
        onVerifyEmail={() => setIsVerificationModalOpen(true)}
      />

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SETTINGS_NAV_ITEMS.filter(
          item => item.href !== '/settings/billing-usage' || featureFlags.subscription.enabled(),
        ).map(item => (
          <SettingsNavCard
            key={item.href}
            href={item.href}
            icon={<item.icon size={24} />}
            title={item.title}
            description={item.description}
          />
        ))}
      </div>

      {/* Modals */}
      {user && (
        <>
          <EditProfileModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={user}
            onSave={updateProfile}
            onImageChange={image => updateUser({ image })}
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
