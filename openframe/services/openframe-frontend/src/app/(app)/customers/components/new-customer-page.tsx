'use client';

import {
  CheckboxBlock,
  ImageUploader,
  Input,
  PageLayout,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { safeBackOrReplace, useSafeBack } from '@/app/hooks/use-safe-back';
import { featureFlags } from '@/lib/feature-flags';
import { getFullImageUrl } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { runtimeEnv } from '@/lib/runtime-config';
import { deleteWithAuth, uploadWithAuth } from '@/lib/upload-with-auth';
import { dashboardQueryKeys } from '../../dashboard/utils/query-keys';
import { useCreateCustomer } from '../hooks/use-create-customer';
import { customerDetailsQueryKeys, useCustomerDetails } from '../hooks/use-customer-details';
import { useUpdateCustomer } from '../hooks/use-update-customer';
import {
  CustomerAiAssistantAppearance,
  type CustomerAppearanceHandle,
} from './ai-assistant-appearance/customer-ai-assistant-appearance';

interface NewCustomerPageProps {
  organizationId: string | null;
}

interface FormState {
  name: string;
  website: string;
  notes: string;
  physicalAddress: string;
  mailingAddress: string;
  mailingSameAsPhysical: boolean;
  imageUrl?: string;
  imageHash?: string;
}

interface PreservedFields {
  category?: string;
  numberOfEmployees: number | null;
  monthlyRevenue: number | null;
  contractStartDate?: string;
  contractEndDate?: string;
  contacts: Array<{ contactName: string; title: string; phone: string; email: string }>;
}

const DEFAULT_FORM: FormState = {
  name: '',
  website: '',
  notes: '',
  physicalAddress: '',
  mailingAddress: '',
  mailingSameAsPhysical: true,
};

const DEFAULT_PRESERVED: PreservedFields = {
  numberOfEmployees: null,
  monthlyRevenue: null,
  contacts: [],
};

const buildAddressDto = (raw: string) => ({
  street1: raw || '',
  street2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
});

const stripPlaceholder = (value?: string | null): string => {
  if (!value || value === '-') return '';
  return value;
};

const contactToDto = (c: { name: string; title: string; phone: string; email: string }) => ({
  contactName: c.name,
  title: c.title,
  phone: c.phone,
  email: c.email,
});

export function NewCustomerPage({ organizationId }: NewCustomerPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { createOrganization } = useCreateCustomer();
  const { updateOrganization } = useUpdateCustomer();
  const { organization } = useCustomerDetails(organizationId);

  const handleBack = useSafeBack(organizationId ? routes.customers.details(organizationId) : routes.customers.list());

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [preserved, setPreserved] = useState<PreservedFields>(DEFAULT_PRESERVED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [didPrefill, setDidPrefill] = useState(false);

  // For new orgs: file is held in memory until creation, then uploaded.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | undefined>(undefined);
  const previewUrlRef = useRef<string | undefined>(undefined);
  // Lets "Save Customer" also persist the AI-Assistant appearance block.
  const appearanceRef = useRef<CustomerAppearanceHandle>(null);

  const isSaasTenant = runtimeEnv.appMode() === 'saas-tenant';
  const showImageUploader = isSaasTenant;
  const displayedImage = pendingPreviewUrl || getFullImageUrl(form.imageUrl, form.imageHash);

  const set = (partial: Partial<FormState>) => setForm(prev => ({ ...prev, ...partial }));

  // Revoke blob URLs on unmount
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!organizationId || !organization || didPrefill) return;

    const physical = organization.physicalAddress || '';
    const mailing = organization.mailingAddress || '';
    const sameAsPhysical = !mailing || mailing === physical;

    setForm({
      name: stripPlaceholder(organization.name),
      website: stripPlaceholder(organization.website),
      notes: (organization.notes || []).join('\n'),
      physicalAddress: physical,
      mailingAddress: mailing,
      mailingSameAsPhysical: sameAsPhysical,
      imageUrl: organization.imageUrl || undefined,
      imageHash: organization.imageHash || undefined,
    });

    const reconstructedContacts = [organization.primary, organization.billing, organization.technical]
      .filter(c => c.name || c.title || c.phone || c.email)
      .map(contactToDto);

    setPreserved({
      category: stripPlaceholder(organization.industry) || undefined,
      numberOfEmployees: organization.employees,
      monthlyRevenue: organization.mrrUsd,
      contractStartDate: organization.contractStart
        ? new Date(organization.contractStart).toISOString().slice(0, 10)
        : undefined,
      contractEndDate: organization.contractEnd
        ? new Date(organization.contractEnd).toISOString().slice(0, 10)
        : undefined,
      contacts: reconstructedContacts,
    });

    setDidPrefill(true);
  }, [organizationId, organization, didPrefill]);

  // Mirror physical → mailing when checkbox is on
  useEffect(() => {
    if (form.mailingSameAsPhysical && form.mailingAddress !== form.physicalAddress) {
      setForm(prev => ({ ...prev, mailingAddress: prev.physicalAddress }));
    }
  }, [form.mailingSameAsPhysical, form.physicalAddress, form.mailingAddress]);

  const replacePendingPreview = (file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (file) {
      const next = URL.createObjectURL(file);
      previewUrlRef.current = next;
      setPendingPreviewUrl(next);
    } else {
      previewUrlRef.current = undefined;
      setPendingPreviewUrl(undefined);
    }
    setPendingFile(file);
  };

  const invalidateOrganizationImageQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ...(organizationId
        ? [queryClient.invalidateQueries({ queryKey: customerDetailsQueryKeys.detail(organizationId) })]
        : []),
    ]);
  };

  const handleImageChange = async (file: File) => {
    if (organizationId) {
      try {
        const uploadedUrl = await uploadWithAuth(`/api/organizations/${organizationId}/image`, file);
        // The image path is stable across uploads, so bust the cache with the
        // upload time — otherwise the uploader keeps showing the old bytes.
        set({ imageUrl: uploadedUrl, imageHash: String(Date.now()) });
        // The image persists immediately (independent of Save), so refresh the
        // cached org lists that render this logo with its hash elsewhere.
        await invalidateOrganizationImageQueries();
        toast({
          title: 'Upload successful',
          description: 'Customer image has been updated',
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: 'Upload failed',
          description: err instanceof Error ? err.message : 'Failed to upload image',
          variant: 'destructive',
        });
      }
    } else {
      replacePendingPreview(file);
    }
  };

  const handleImageRemove = async () => {
    if (organizationId && form.imageUrl) {
      try {
        await deleteWithAuth(`/api/organizations/${organizationId}/image`);
        set({ imageUrl: undefined, imageHash: undefined });
        await invalidateOrganizationImageQueries();
        toast({
          title: 'Delete successful',
          description: 'Customer image has been deleted',
          variant: 'success',
        });
      } catch (err) {
        toast({
          title: 'Delete failed',
          description: err instanceof Error ? err.message : 'Failed to delete image',
          variant: 'destructive',
        });
      }
    } else {
      replacePendingPreview(null);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);

      // Validate the AI-Assistant appearance fields before writing anything.
      if (appearanceRef.current && !(await appearanceRef.current.validate())) {
        toast({
          title: 'Check AI-Assistant appearance',
          description: 'Fix the highlighted appearance fields before saving',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const payload = {
        name: form.name.trim(),
        category: preserved.category,
        numberOfEmployees: preserved.numberOfEmployees,
        websiteUrl: form.website.trim() || undefined,
        notes: form.notes || undefined,
        contactInformation: {
          contacts: preserved.contacts,
          physicalAddress: buildAddressDto(form.physicalAddress),
          mailingAddress: buildAddressDto(form.mailingSameAsPhysical ? form.physicalAddress : form.mailingAddress),
          mailingAddressSameAsPhysical: form.mailingSameAsPhysical,
        },
        monthlyRevenue: preserved.monthlyRevenue,
        contractStartDate: preserved.contractStartDate,
        contractEndDate: preserved.contractEndDate,
      };

      let createdOrganizationId: string | null = null;

      if (organizationId) {
        await updateOrganization(organizationId, payload);
      } else {
        const response = await createOrganization(payload);
        createdOrganizationId = response?.organizationId || response?.id || null;
      }

      // Deferred logo upload for newly-created orgs
      if (!organizationId && createdOrganizationId && pendingFile) {
        try {
          await uploadWithAuth(`/api/organizations/${createdOrganizationId}/image`, pendingFile);
        } catch {
          toast({
            title: 'Warning',
            description: 'Customer was created but logo upload failed',
            variant: 'warning',
          });
        }
      }

      // Persist the AI-Assistant appearance override/reset (edit mode only).
      // The customer is already saved at this point, so an appearance failure is
      // a non-fatal warning — it must not surface as a full "Save failed".
      if (organizationId && appearanceRef.current) {
        try {
          await appearanceRef.current.commit();
        } catch (e) {
          toast({
            title: 'Customer saved, appearance not updated',
            description: e instanceof Error ? e.message : 'Failed to save AI-Assistant appearance',
            variant: 'warning',
          });
        }
      }

      await invalidateOrganizationImageQueries();

      toast({
        title: organizationId ? 'Customer updated' : 'Customer created',
        description: `${form.name} has been ${organizationId ? 'updated' : 'created'}`,
      });
      if (organizationId) {
        safeBackOrReplace(router, routes.customers.details(organizationId));
      } else {
        router.replace(routes.customers.list());
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save customer';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDisabled = !form.name.trim() || isSubmitting;

  return (
    <PageLayout
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      title={organizationId ? 'Edit Customer' : 'New Customer'}
      backButton={{
        label: 'Back',
        onClick: handleBack,
      }}
      actionsVariant="primary-buttons"
      actions={[
        {
          label: isSubmitting ? 'Saving...' : 'Save Customer',
          variant: 'accent',
          onClick: handleSave,
          disabled: saveDisabled,
          loading: isSubmitting,
        },
      ]}
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Row 1: name + website (left) | image (right on lg, below on md/sm) */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 min-w-0 flex flex-col gap-6 md:flex-row md:gap-6 lg:flex-col">
            <div className="flex-1 min-w-0">
              <Input
                label="Customer Name"
                placeholder="Customer Name"
                value={form.name}
                onChange={e => set({ name: e.target.value })}
              />
            </div>
            <div className="flex-1 min-w-0">
              <Input
                label="Website URL"
                placeholder="https://www.website.com"
                value={form.website}
                onChange={e => set({ website: e.target.value })}
              />
            </div>
          </div>

          {showImageUploader && (
            <div className="w-full lg:w-[316px] shrink-0">
              <ImageUploader
                value={displayedImage}
                onChange={handleImageChange}
                onRemove={handleImageRemove}
                objectFit="contain"
                label="Customer Logo"
                description="(Click here or drag and drop)"
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <Textarea
          label="Notes"
          rows={4}
          placeholder="Your notes here..."
          value={form.notes}
          onChange={e => set({ notes: e.target.value })}
          className="min-h-[96px] resize-y"
        />

        {/* Row 3: physical address + same-as-physical checkbox */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-end">
          <div className="flex-1 min-w-0">
            <Input
              label="Physical Address"
              placeholder="123 Main St, City, State, ZIP"
              value={form.physicalAddress}
              onChange={e => set({ physicalAddress: e.target.value })}
            />
          </div>
          <CheckboxBlock
            id="mailing-same"
            className="flex-1 min-w-0 md:max-w-[50%]"
            label="Mailing Address Same as Physical"
            checked={form.mailingSameAsPhysical}
            onCheckedChange={c => set({ mailingSameAsPhysical: Boolean(c) })}
          />
        </div>

        {/* Mailing address (full width) */}
        <Input
          label="Mailing Address"
          placeholder="123 Main St, City, State, ZIP"
          value={form.mailingAddress}
          onChange={e => set({ mailingAddress: e.target.value })}
          disabled={form.mailingSameAsPhysical}
          className="disabled:opacity-60"
        />

        {/* AI-Assistant Appearance — per-customer override. Gated behind the
            customer-ai-assistant-settings flag (feature not released yet). SaaS-only:
            it relies on the openframe-saas-ai-agent service (/chat/graphql), absent in
            self-hosted. Edit mode only, since it needs an org id to scope the override. */}
        {organizationId && isSaasTenant && featureFlags.customerAiAssistantSettings.enabled() && (
          <>
            <div className="border-t border-ods-border" />
            <CustomerAiAssistantAppearance ref={appearanceRef} organizationId={organizationId} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
