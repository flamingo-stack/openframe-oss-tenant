'use client';

import { Button, ListPageContainer, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import {
  Hierarchy02Icon,
  PasscodeIcon,
  ShieldCheckIcon,
  ShieldKeyholeIcon,
  UsersGroupIcon,
  WrenchScrewdiverIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageError } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { AlertCircle, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../../lib/api-client';
import { authApiClient } from '../../../lib/auth-api-client';
import { handleApiError } from '../../../lib/handle-api-error';
import { useAuthStore } from '../../auth/stores';
import { EditProfileModal } from './edit-profile-modal';
import { EmailVerificationModal } from './email-verification-modal';
import { SettingsNavCard } from './settings-nav-card';

const SETTINGS_NAV_ITEMS = [
  {
    href: '/settings/integrated-tools',
    icon: <WrenchScrewdiverIcon size={24} />,
    title: 'Integrated Tools',
    description: 'Configure and manage third-party tool integrations',
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
  const isLoadingProfile = useAuthStore(state => state.isLoadingProfile);
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

  const getInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'UN';
  };

  useEffect(() => {
    fetchFullProfile();
  }, [fetchFullProfile]);

  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '—';

  return (
    <ListPageContainer title="Settings" background="default" padding="none" className="pt-6">
      {/* Profile Card */}
      {isLoadingProfile && !user ? (
        <Skeleton className="h-20 w-full rounded-md" />
      ) : !user ? (
        <PageError message="No user data available" />
      ) : (
        <div className="bg-ods-card border border-ods-border rounded-md p-4 flex items-center gap-4">
          <div className="shrink-0">
            {user.image?.imageUrl ? (
              <img
                src={user.image.imageUrl}
                alt="Profile"
                className="w-12 h-12 rounded-full object-cover border border-ods-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-ods-bg border border-ods-border flex items-center justify-center">
                <span className="text-sm font-medium text-ods-text-secondary">{getInitials()}</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium text-ods-text-primary truncate">{displayName}</span>
              {user.roles?.map(role => (
                <span
                  key={role}
                  className="shrink-0 inline-flex items-center px-2 py-1 rounded-md text-xs font-mono font-medium uppercase bg-ods-card border border-ods-border text-ods-text-primary"
                >
                  {role}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-ods-text-secondary truncate">{user.email}</p>
              {user.emailVerified === false && (
                <button
                  type="button"
                  onClick={() => setIsVerificationModalOpen(true)}
                  className="flex items-center gap-1 text-ods-warning hover:text-ods-warning/80 transition-colors"
                  title="Email not verified - click to resend verification"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Not verified</span>
                </button>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Pencil className="w-5 h-5" />}
            >
              <span className="font-bold">Edit Profile</span>
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SETTINGS_NAV_ITEMS.map(item => (
          <SettingsNavCard
            key={item.href}
            href={item.href}
            icon={typeof item.icon === 'function' ? <item.icon size={24} /> : item.icon}
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
    </ListPageContainer>
  );
}
