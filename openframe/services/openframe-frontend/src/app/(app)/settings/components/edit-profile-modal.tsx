'use client';

import { Button, Input, Label } from '@flamingo-stack/openframe-frontend-core';
import { ImageUploader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/app/(auth)/auth/stores';
import { useAuthStore } from '@/app/(auth)/auth/stores';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (data: { firstName: string; lastName: string }) => Promise<void>;
  isSaving: boolean;
}

export function EditProfileModal({ isOpen, onClose, user, onSave, isSaving }: EditProfileModalProps) {
  const { toast } = useToast();
  const updateUser = useAuthStore(state => state.updateUser);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [imageHash, setImageHash] = useState<string | undefined>();
  const [isImageBusy, setIsImageBusy] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setImageUrl(user.image?.imageUrl);
      setImageHash(user.image?.hash);
    }
  }, [isOpen, user]);

  const handleImageChange = useCallback(
    async (file: File) => {
      setIsImageBusy(true);
      try {
        const uploadedUrl = await uploadWithAuth('/api/users/image', file);
        // The image path is stable across uploads, so push the new URL with a
        // fresh cache-bust into the auth store and the modal preview — this
        // updates every avatar render site (header, profile card, this uploader)
        // immediately, without a stale-read race on a separate profile GET.
        const bust = String(Date.now());
        setImageUrl(uploadedUrl);
        setImageHash(bust);
        updateUser({ image: { imageUrl: uploadedUrl, hash: bust } });
        toast({ title: 'Upload successful', description: 'Profile image has been updated', variant: 'success' });
      } catch (err) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Failed to upload image',
          variant: 'destructive',
        });
      } finally {
        setIsImageBusy(false);
      }
    },
    [toast, updateUser],
  );

  const handleImageRemove = useCallback(async () => {
    setIsImageBusy(true);
    try {
      await deleteWithAuth('/api/users/image');
      setImageUrl(undefined);
      setImageHash(undefined);
      updateUser({ image: undefined });
      toast({ title: 'Delete successful', description: 'Profile image has been removed', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Failed to remove image',
        variant: 'destructive',
      });
    } finally {
      setIsImageBusy(false);
    }
  }, [toast, updateUser]);

  const handleSave = useCallback(async () => {
    const saved = await onSave({ firstName, lastName }).then(
      () => true,
      () => false,
    );
    if (saved) onClose();
  }, [firstName, lastName, onSave, onClose]);

  const primaryRole = user?.roles?.[0] || 'User';
  const displayImageUrl = getFullImageUrl(imageUrl, imageHash);

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-[600px]"
      title="Edit Profile"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 h-12 bg-ods-card border-ods-border text-ods-text-primary font-bold text-lg hover:bg-ods-bg"
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 h-12 bg-ods-accent text-ods-card font-bold text-lg hover:bg-ods-accent/90"
          >
            {isSaving ? 'Saving...' : 'Update Profile'}
          </Button>
        </>
      }
    >
      <ImageUploader
        value={displayImageUrl}
        onChange={handleImageChange}
        onRemove={handleImageRemove}
        loading={isImageBusy}
        objectFit="cover"
        maxSize={5 * 1024 * 1024}
        label="Upload profile image"
        description="Click to upload or drag and drop"
        alt={[firstName, lastName].filter(Boolean).join(' ') || 'Profile image'}
      />

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <Label htmlFor="edit-firstName" className="text-ods-text-primary text-lg font-medium">
            First Name
          </Label>
          <Input
            id="edit-firstName"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            disabled={isSaving}
            placeholder="First name"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="edit-lastName" className="text-ods-text-primary text-lg font-medium">
            Last Name
          </Label>
          <Input
            id="edit-lastName"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            disabled={isSaving}
            placeholder="Last name"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <Label className="text-ods-text-primary text-lg font-medium">Email</Label>
          <Input id="edit-email" value={user?.email || ''} disabled placeholder="Email" />
        </div>
        <div className="space-y-1">
          <Label className="text-ods-text-primary text-lg font-medium">Role</Label>
          <Input id="edit-roles" value={primaryRole} disabled placeholder="Role" />
        </div>
      </div>
    </SimpleModal>
  );
}
