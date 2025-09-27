'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@flamingo/ui-kit'
import { Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@flamingo/ui-kit/components/ui'
import { useToast } from '@flamingo/ui-kit/hooks'
import { PlusCircleIcon, IconsXIcon } from '@flamingo/ui-kit/components/icons'

type InviteRow = { email: string; role: string }

interface AddUsersModalProps {
  isOpen: boolean
  onClose: () => void
  onInvited?: () => Promise<void> | void
  invite: (rows: InviteRow[]) => Promise<void>
}

export function AddUsersModal({ isOpen, onClose, onInvited, invite }: AddUsersModalProps) {
  const [rows, setRows] = useState<InviteRow[]>([{ email: '', role: 'Admin' }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, [])
  const canSubmit = useMemo(() => rows.some(r => emailRegex.test(r.email.trim())), [rows, emailRegex])
  const roleOptions = useMemo(() => [
    { value: 'Admin', label: 'Admin' }
  ], [])

  useEffect(() => {
    if (!isOpen) {
      setRows([{ email: '', role: 'Admin' }])
      setIsSubmitting(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const setRow = (idx: number, patch: Partial<InviteRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }

  const addRow = () => setRows(prev => [...prev, { email: '', role: 'Admin' }])
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (!canSubmit) return
    const payload = rows
      .map(r => ({ email: r.email.trim(), role: r.role }))
      .filter(r => emailRegex.test(r.email))
    if (payload.length === 0) return
    setIsSubmitting(true)
    try {
      await invite(payload)
      toast({ title: 'Invites sent', description: `${payload.length} user(s) invited`, variant: 'success' })
      onClose()
      await onInvited?.()
    } catch (err) {
      toast({ title: 'Invite failed', description: err instanceof Error ? err.message : 'Failed to send invites', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-ods-card border border-ods-border rounded-[6px] w-full max-w-[720px] flex flex-col p-10 gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-['Azeret_Mono'] font-semibold text-[32px] tracking-[-0.8px] text-ods-text-primary">
            Add Users
          </h2>
          <Button onClick={onClose} variant="ghost" className="text-ods-text-secondary hover:text-white p-1">
            <X className="h-6 w-6" />
          </Button>
        </div>

        <p className="font-['DM_Sans'] text-[18px] leading-[24px] text-ods-text-primary">
          Enter the emails of the users you want to add to the system, we will send them invitations to register.
        </p>

        {/* Column Labels */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_12rem_auto] gap-4 items-end">
          <div className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary">User Email</div>
          <div className="font-['DM_Sans'] font-medium text-[18px] text-ods-text-primary w-48">Role</div>
          <div />
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-4">
          {rows.map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_12rem_auto] gap-4 items-center">
              <div className="flex flex-col gap-2">
                <Input
                  placeholder="Enter Email Here"
                  value={row.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRow(idx, { email: e.target.value })}
                  className="h-14 border-ods-border bg-ods-card"
                  invalid={row.email.length > 0 && !emailRegex.test(row.email)}
                />
              </div>
              <div className="flex items-center gap-3 self-center">
                <div className="flex flex-col gap-2 w-48">
                  <Select value={row.role} onValueChange={(v) => setRow(idx, { role: v })}>
                    <SelectTrigger className="h-14 border-ods-border bg-ods-card">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {rows.length > 1 && (
                  <Button onClick={() => removeRow(idx)} variant="ghost" className="h-8 w-8 bg-ods-card hover:bg-ods-bg-hover p-0 flex items-center justify-center">
                    <IconsXIcon width={12} height={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <Button 
            onClick={addRow} 
            variant="ghost" 
            className="text-ods-text-primary px-0 py-0 h-auto gap-2 font-['DM_Sans'] font-bold text-[18px]"
            leftIcon={<PlusCircleIcon iconSize={20} whiteOverlay />}
          >
            Add More Users
          </Button>
        </div>

        {/* Footer */}
        <div className="flex gap-6 pt-2">
          <Button onClick={onClose} className="flex-1 bg-ods-card border border-ods-border text-ods-text-primary font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] hover:bg-ods-bg-surface transition-colors">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="flex-1 bg-ods-accent text-text-on-accent font-['DM_Sans'] font-bold text-[18px] leading-[24px] tracking-[-0.36px] px-4 py-3 rounded-[6px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ods-accent-hover transition-colors">
            Send Invites
          </Button>
        </div>
      </div>
    </div>
  )
}


