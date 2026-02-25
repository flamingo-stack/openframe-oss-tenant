'use client';

import { Button, Label, Modal, ModalFooter, ModalHeader, ModalTitle } from '@flamingo-stack/openframe-frontend-core';
import { IconsXIcon, PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import React, { useEffect, useMemo, useState } from 'react';

type InviteRow = { email: string; role: string };

interface AddUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvited?: () => Promise<void> | void;
  invite: (rows: InviteRow[]) => Promise<void>;
}

export function AddUsersModal({ isOpen, onClose, onInvited, invite }: AddUsersModalProps) {
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'Admin' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const canSubmit = useMemo(() => rows.some(r => emailRegex.test(r.email.trim())), [rows, emailRegex]);
  const roleOptions = useMemo(() => [{ value: 'Admin', label: 'Admin' }], []);

  useEffect(() => {
    if (!isOpen) {
      setRows([{ email: '', role: 'Admin' }]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const setRow = (idx: number, patch: Partial<InviteRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows(prev => [...prev, { email: '', role: 'Admin' }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const payload = rows.map(r => ({ email: r.email.trim(), role: r.role })).filter(r => emailRegex.test(r.email));
    if (payload.length === 0) return;
    setIsSubmitting(true);
    try {
      await invite(payload);
      toast({ title: 'Invites sent', description: `${payload.length} user(s) invited`, variant: 'success' });
      onClose();
      await onInvited?.();
    } catch (err) {
      toast({
        title: 'Invite failed',
        description: err instanceof Error ? err.message : 'Failed to send invites',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalHeader>
        <ModalTitle>Add Users</ModalTitle>
        <p className="text-ods-text-secondary text-sm mt-1">
          Enter the emails of the users you want to add to the system, we will send them invitations to register.
        </p>
      </ModalHeader>

      <div className="px-6 py-4 space-y-4">
        {/* Column Labels */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_12rem_auto] gap-4 items-end">
          <Label>User Email</Label>
          <Label className="w-48">Role</Label>
          <div />
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_12rem_auto] gap-4 items-center">
              <Input
                placeholder="Enter Email Here"
                value={row.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRow(idx, { email: e.target.value })}
                className="bg-ods-card"
                invalid={row.email.length > 0 && !emailRegex.test(row.email)}
              />
              <div className="flex items-center gap-3">
                <Select value={row.role} onValueChange={v => setRow(idx, { role: v })}>
                  <SelectTrigger className="bg-ods-card w-48">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rows.length > 1 && (
                  <Button onClick={() => removeRow(idx)} variant="ghost" size="icon">
                    <IconsXIcon width={16} height={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button onClick={addRow} variant="ghost" leftIcon={<PlusCircleIcon iconSize={20} whiteOverlay />}>
          Add More Users
        </Button>
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Invites'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
