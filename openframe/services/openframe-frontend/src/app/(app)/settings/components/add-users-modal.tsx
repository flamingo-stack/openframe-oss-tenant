'use client';

import { PlusCircleIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  Input,
  Label,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
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
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'Viewer' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const canSubmit = useMemo(() => rows.some(r => emailRegex.test(r.email.trim())), [rows, emailRegex]);
  const roleOptions = useMemo(
    () => [
      { value: 'Admin', label: 'Admin' },
      { value: 'Viewer', label: 'Viewer' },
    ],
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setRows([{ email: '', role: 'Viewer' }]);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const setRow = (idx: number, patch: Partial<InviteRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows(prev => [...prev, { email: '', role: 'Viewer' }]);
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
    <ModalV2 isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <ModalV2Header>
        <ModalV2Title>Add Employees</ModalV2Title>
      </ModalV2Header>

      <ModalV2Content className="flex flex-col gap-[var(--spacing-system-l)]">
        <p className="text-h4 text-ods-text-primary">
          Enter the emails of the users you want to add to the system, we will send them invitations to register.
        </p>

        <div className="flex flex-col gap-[var(--spacing-system-xs)]">
          <div className="grid grid-cols-2 gap-2">
            <Label>User Email</Label>
            <Label>Role</Label>
          </div>

          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-2 items-center">
              <Input
                placeholder="Enter Email Here"
                value={row.email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRow(idx, { email: e.target.value })}
                invalid={row.email.length > 0 && !emailRegex.test(row.email)}
              />
              <div className="flex items-center gap-2">
                <Select value={row.role} onValueChange={v => setRow(idx, { role: v })}>
                  <SelectTrigger className="flex-1">
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
                  <Button variant="card" size="icon" onClick={() => removeRow(idx)} className="shrink-0">
                    <TrashIcon className="size-5 text-[var(--ods-attention-red-error-action)]" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            variant="ghost-subtle"
            className="self-start"
            onClick={addRow}
            noPadding
            leftIcon={<PlusCircleIcon size={24} className="text-ods-text-primary" />}
          >
            Add More Users
          </Button>
        </div>
      </ModalV2Content>

      <ModalV2Footer>
        <Button variant="outline" className="flex-1" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit || isSubmitting} loading={isSubmitting}>
          {isSubmitting ? 'Sending...' : 'Send Invites'}
        </Button>
      </ModalV2Footer>
    </ModalV2>
  );
}
