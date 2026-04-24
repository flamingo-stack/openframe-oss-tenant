'use client';

import { Checkbox, Input, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import React, { useCallback, useEffect } from 'react';

export type ContactInfoState = {
  primaryName: string;
  primaryTitle: string;
  primaryPhone: string;
  primaryEmail: string;

  billingName: string;
  billingTitle: string;
  billingPhone: string;
  billingEmail: string;

  technicalName: string;
  technicalTitle: string;
  technicalPhone: string;
  technicalEmail: string;

  physicalAddress: string;
  mailingAddress: string;
  mailingSameAsPhysical: boolean;
};

interface ContactInformationTabProps {
  value: ContactInfoState;
  onChange: (next: ContactInfoState) => void;
}

export function ContactInformationTab({ value, onChange }: ContactInformationTabProps) {
  const set = useCallback(
    (partial: Partial<ContactInfoState>) => onChange({ ...value, ...partial }),
    [onChange, value],
  );

  // Keep mailing address synced when the toggle is on
  useEffect(() => {
    if (value.mailingSameAsPhysical && value.mailingAddress !== value.physicalAddress) {
      set({ mailingAddress: value.physicalAddress });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.mailingSameAsPhysical, value.physicalAddress, set, value.mailingAddress]);

  return (
    <div className="pt-6 flex flex-col gap-6">
      {/* Primary contact row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="primary-name">Primary Contact Name</Label>
          <Input
            id="primary-name"
            value={value.primaryName}
            onChange={e => set({ primaryName: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="primary-title">Title</Label>
          <Input
            id="primary-title"
            value={value.primaryTitle}
            onChange={e => set({ primaryTitle: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="primary-phone">Phone</Label>
          <Input
            id="primary-phone"
            value={value.primaryPhone}
            onChange={e => set({ primaryPhone: e.target.value })}
            placeholder="+1 (XXX) XXX-XXXX"
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="primary-email">Email</Label>
          <Input
            id="primary-email"
            type="email"
            value={value.primaryEmail}
            onChange={e => set({ primaryEmail: e.target.value })}
            placeholder="email@company.com"
            className="bg-ods-card border border-ods-border"
          />
        </div>
      </div>

      {/* Billing contact row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="billing-name">Billing Contact Name</Label>
          <Input
            id="billing-name"
            value={value.billingName}
            onChange={e => set({ billingName: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="billing-title">Title</Label>
          <Input
            id="billing-title"
            value={value.billingTitle}
            onChange={e => set({ billingTitle: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="billing-phone">Phone</Label>
          <Input
            id="billing-phone"
            value={value.billingPhone}
            onChange={e => set({ billingPhone: e.target.value })}
            placeholder="+1 (XXX) XXX-XXXX"
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="billing-email">Email</Label>
          <Input
            id="billing-email"
            type="email"
            value={value.billingEmail}
            onChange={e => set({ billingEmail: e.target.value })}
            placeholder="email@company.com"
            className="bg-ods-card border border-ods-border"
          />
        </div>
      </div>

      {/* Technical contact row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="technical-name">Technical Contact Name</Label>
          <Input
            id="technical-name"
            value={value.technicalName}
            onChange={e => set({ technicalName: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="technical-title">Title</Label>
          <Input
            id="technical-title"
            value={value.technicalTitle}
            onChange={e => set({ technicalTitle: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="technical-phone">Phone</Label>
          <Input
            id="technical-phone"
            value={value.technicalPhone}
            onChange={e => set({ technicalPhone: e.target.value })}
            placeholder="+1 (XXX) XXX-XXXX"
            className="bg-ods-card border border-ods-border"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="technical-email">Email</Label>
          <Input
            id="technical-email"
            type="email"
            value={value.technicalEmail}
            onChange={e => set({ technicalEmail: e.target.value })}
            placeholder="email@company.com"
            className="bg-ods-card border border-ods-border"
          />
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="physical-address">Physical Address</Label>
          <Input
            id="physical-address"
            value={value.physicalAddress}
            onChange={e => set({ physicalAddress: e.target.value })}
            placeholder="123 Main St, City, State, ZIP"
            className="bg-ods-card border border-ods-border"
          />
        </div>

        {/* Same as physical toggle */}
        <div className="flex items-center gap-3">
          <Checkbox
            id="mailing-same"
            checked={value.mailingSameAsPhysical}
            onCheckedChange={c => set({ mailingSameAsPhysical: Boolean(c) })}
          />
          <Label htmlFor="mailing-same" className="text-ods-text-primary">
            Mailing Address Same as Physical
          </Label>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="mailing-address">Mailing Address</Label>
          <Input
            id="mailing-address"
            value={value.mailingAddress}
            onChange={e => set({ mailingAddress: e.target.value })}
            placeholder="123 Main St, City, State, ZIP"
            disabled={value.mailingSameAsPhysical}
            className="bg-ods-card border border-ods-border disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
}
