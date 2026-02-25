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
import { useCallback, useEffect, useState } from 'react';
import type { User } from '../../auth/stores';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (data: { firstName: string; lastName: string }) => Promise<void>;
  isSaving: boolean;
}

export function EditProfileModal({ isOpen, onClose, user, onSave, isSaving }: EditProfileModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Sync form state when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [isOpen, user]);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      {/* Custom header with close button */}
      <ModalHeader>
        <ModalTitle>Edit Profile</ModalTitle>
      </ModalHeader>

      <div className="px-10 py-6 space-y-6">
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
