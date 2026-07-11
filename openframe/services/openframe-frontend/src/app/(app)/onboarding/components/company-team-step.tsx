'use client';

import {
  CheckCircleIcon,
  ExternalLinkIcon,
  PlusCircleIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import Link from 'next/link';
import { type ChangeEvent, useMemo, useState } from 'react';
import { routes } from '@/lib/routes';
import { useInvitations } from '../../settings/hooks/use-invitations';
import { useStepActionState } from '../use-step-action-state';

type InviteRow = { email: string; role: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_OPTIONS = [{ value: 'ADMIN', label: 'Admin' }];
const newRow = (): InviteRow => ({ email: '', role: 'ADMIN' });

/**
 * Inner body of the "Company & Team" onboarding step. Reuses the team-invite building
 * blocks from settings ({@link ../../settings/components/add-users-modal}) — the same
 * row model and the `useInvitations().inviteUsers` mutation.
 */
export function CompanyTeamStep({
  onComplete,
  completed,
  completing,
}: {
  onComplete?: () => void;
  completed?: boolean;
  completing?: boolean;
}) {
  const { toast } = useToast();
  const { inviteUsers } = useInvitations();

  const [rows, setRows] = useState<InviteRow[]>([newRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const actions = useStepActionState({ completing, primaryBusy: isSubmitting });

  const canSubmit = useMemo(() => rows.some(r => EMAIL_REGEX.test(r.email.trim())), [rows]);

  const setRow = (idx: number, patch: Partial<InviteRow>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSendInvites = async () => {
    const emails = rows.map(r => r.email.trim()).filter(email => EMAIL_REGEX.test(email));
    if (emails.length === 0) return;
    setIsSubmitting(true);
    try {
      await inviteUsers(emails);
      toast({ title: 'Invites sent', description: `${emails.length} user(s) invited`, variant: 'success' });
      setRows([newRow()]);
      // Sending invites completes the onboarding step — but only the first time, so
      // inviting more people on an already-complete step doesn't re-fire it.
      if (!completed) onComplete?.();
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
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Invite your technicians to OpenFrame. They&apos;ll receive an email with a link to set up their account.
      </p>

      <div className="flex flex-col">
        {/* Column labels — shown once above the rows */}
        <div className="grid grid-cols-1 gap-[var(--spacing-system-xs)] md:grid-cols-2">
          <Label>User Email</Label>
          <Label className="hidden md:block">Role</Label>
        </div>

        <div className="flex flex-col gap-[var(--spacing-system-xs)]">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 items-center gap-[var(--spacing-system-xs)] md:grid-cols-2">
              <Input
                placeholder="Enter Email Here"
                value={row.email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setRow(idx, { email: e.target.value })}
                invalid={row.email.length > 0 && !EMAIL_REGEX.test(row.email)}
              />
              <div className="flex items-center gap-[var(--spacing-system-xs)]">
                <Select value={row.role} onValueChange={v => setRow(idx, { role: v })}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rows.length > 1 && (
                  <Button variant="outline" size="icon" onClick={() => removeRow(idx)} className="shrink-0">
                    <TrashIcon className="size-5 text-[var(--ods-attention-red-error-action)]" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="small"
            className="self-start"
            onClick={addRow}
            leftIcon={<PlusCircleIcon size={24} className="text-ods-text-primary" />}
          >
            Add More Users
          </Button>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <Link
          href={routes.settings.employees}
          className="flex flex-1 items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary transition-colors hover:text-ods-text-primary"
        >
          <ExternalLinkIcon size={24} className="shrink-0" />
          <span className="text-h4 underline">Manage Roles</span>
        </Link>
        <div className="hidden flex-1 md:block" />
        {!completed ? (
          <Button
            variant="outline"
            leftIcon={<CheckCircleIcon className="size-5" />}
            onClick={() => {
              actions.begin('complete');
              onComplete?.();
            }}
            loading={actions.complete.loading}
            disabled={actions.complete.disabled}
            className="w-full md:flex-1"
          >
            Mark as Complete
          </Button>
        ) : (
          // Keep the completed step's primary button its own width — don't let it
          // stretch into the removed "Mark as Complete" slot.
          <div className="hidden md:block md:flex-1" aria-hidden />
        )}
        <Button
          variant="accent"
          onClick={() => {
            actions.begin('primary');
            handleSendInvites();
          }}
          disabled={!canSubmit || actions.primary.disabled}
          loading={actions.primary.loading}
          className="w-full md:flex-1"
        >
          Send Invites
        </Button>
      </div>
    </div>
  );
}
