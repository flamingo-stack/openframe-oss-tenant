'use client';

import {
  Button,
  Input,
  Label,
  Modal,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@flamingo-stack/openframe-frontend-core';
import { HeroImageUploader } from '@flamingo-stack/openframe-frontend-core/components';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useState } from 'react';
import type { User, UserImage } from '@/app/(auth)/auth/stores';
import { getFullImageUrl } from '@/lib/image-url';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (data: { firstName: string; lastName: string }) => Promise<void>;
  onImageChange: (image: UserImage | undefined) => void;
  isSaving: boolean;
}

export function EditProfileModal({ isOpen, onClose, user, onSave, onImageChange, isSaving }: EditProfileModalProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  // Sync form state when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setImageUrl(user.image?.imageUrl);
    }
  }, [isOpen, user]);

  const handleAuthenticatedUpload = useCallback(
    async (file: File): Promise<string> => {
      const uploadedUrl = await uploadWithAuth('/api/users/image', file);
      toast({
        title: 'Upload successful',
        description: 'Profile image has been updated',
        variant: 'success',
      });
      setImageUrl(uploadedUrl);
      onImageChange({ imageUrl: uploadedUrl, hash: '' });
      return uploadedUrl;
    },
    [toast, onImageChange],
  );

  const handleAuthenticatedDelete = useCallback(async (): Promise<void> => {
    await deleteWithAuth('/api/users/image');
    setImageUrl(undefined);
    onImageChange(undefined);
    toast({
      title: 'Delete successful',
      description: 'Profile image has been removed',
      variant: 'success',
    });
  }, [toast, onImageChange]);

  const handleSave = useCallback(async () => {
    await onSave({
      firstName,
      lastName,
    });
    onClose();
  }, [firstName, lastName, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Get primary role for display
  const primaryRole = user?.roles?.[0] || 'User';
  const displayImageUrl = getFullImageUrl(imageUrl);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      {/* Custom header with close button */}
      <ModalHeader>
        <ModalTitle>Edit Profile</ModalTitle>
      </ModalHeader>

      <div className="px-10 py-6 space-y-6">
        {/* Profile Image */}
        <div style={{ maxHeight: '220px' }} className="[&>div]:min-h-0">
          <HeroImageUploader
            imageUrl={displayImageUrl}
            onChange={url => {
              setImageUrl(url);
            }}
            uploadEndpoint="/api/users/image"
            onUpload={handleAuthenticatedUpload}
            onDelete={handleAuthenticatedDelete}
            height={220}
            objectFit="cover"
            showReplaceButton={true}
            deferUpload={false}
          />
        </div>

        {/* Name fields - two columns */}
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

        {/* Email and Role - two columns */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <Label className="text-ods-text-primary text-lg font-medium">Email</Label>
            <Input id="edit-email" value={user?.email || ''} disabled={true} placeholder="Email" />
          </div>
          <div className="space-y-1">
            <Label className="text-ods-text-primary text-lg font-medium">Role</Label>
            <Input id="edit-roles" value={primaryRole} disabled={true} placeholder="Role" />
          </div>
        </div>
      </div>

      {/* Footer buttons */}
      <ModalFooter>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
          className="flex-1 h-12 bg-ods-card border-ods-border text-ods-text-primary font-bold text-lg hover:bg-ods-bg"
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 h-12 bg-ods-accent text-ods-card font-bold text-lg hover:bg-ods-accent/90"
        >
          {isSaving ? 'Saving...' : 'Update Profile'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
