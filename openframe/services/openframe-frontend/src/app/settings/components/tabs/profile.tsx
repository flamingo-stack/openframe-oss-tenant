'use client';

import { Button, Skeleton } from '@flamingo-stack/openframe-frontend-core';
import { PageError } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { AlertCircle, Pencil } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { authApiClient } from '@/lib/auth-api-client';
import { apiClient } from '../../../../lib/api-client';
import { handleApiError } from '../../../../lib/handle-api-error';
import { useAuthStore } from '../../../auth/stores';
import { EditProfileModal } from '../edit-profile-modal';
import { EmailVerificationModal } from '../email-verification-modal';

export function ProfileTab() {
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

        // Update auth store with new data
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

  // Get initials for avatar placeholder
  const getInitials = () => {
    const first = user?.firstName?.charAt(0) || '';
    const last = user?.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'UN';
  };

  useEffect(() => {
    fetchFullProfile();
  }, [fetchFullProfile]);

  // Get display name
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : '—';

  if (isLoadingProfile && !user) {
    return (
      <div className="pt-6">
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pt-6">
        <PageError message="No user data available" />
      </div>
    );
  }

  return (
    <div className="pt-6">
      {/* Profile Card */}
      <div className="bg-ods-card border border-ods-border rounded-md p-4 flex items-center gap-4">
        {/* Avatar */}
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

        {/* Name and Email */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium text-ods-text-primary truncate">{displayName}</span>
            {/* Role badges */}
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
                onClick={() => setIsVerificationModalOpen(true)}
                className="flex items-center gap-1 text-warning hover:text-warning/80 transition-colors"
                title="Email not verified - click to resend verification"
              >
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-medium">Not verified</span>
              </button>
            )}
          </div>
        </div>

        {/* Authorized by section - show if SSO provider is known */}
        {/* <div className="shrink-0 hidden sm:flex items-center gap-2 bg-ods-bg border border-ods-border rounded-lg px-3 py-2">
          <span className="text-sm text-ods-text-secondary">Authorized by</span>
          <GoogleLogo className="w-5 h-5" />
          <MicrosoftIcon className="w-5 h-5" />
        </div> */}

        {/* Action buttons */}
        <div className="shrink-0 flex items-center gap-3">
          {/* <Button
            disabled={true}
            variant="outline"
            leftIcon={<Search className="w-5 h-5" />}
          >
            <span className="font-bold">User Logs</span>
          </Button> */}
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)} leftIcon={<Pencil className="w-5 h-5" />}>
            <span className="font-bold">Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={updateProfile}
        isSaving={isUpdating}
      />

      {/* Email Verification Modal */}
      <EmailVerificationModal
        open={isVerificationModalOpen}
        onOpenChange={setIsVerificationModalOpen}
        userEmail={user.email}
        onSubmit={handleResendVerification}
        isSending={isSendingVerification}
      />
    </div>
  );
}
