'use client';

import { Button, Input } from '@flamingo-stack/openframe-frontend-core';
import { ExternalLinkIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { ImageUploader } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { uploadWithAuth } from '@/lib/upload-with-auth';
import { type CreateCustomerRequest, useCreateCustomer } from '../../customers/hooks/use-create-customer';
import { dashboardQueryKeys } from '../../dashboard/utils/query-keys';

const emptyAddress = { street1: '', street2: '', city: '', state: '', postalCode: '', country: '' };

/**
 * Inner body of the "Customers Setup" onboarding step. Reuses the customer-page form
 * building blocks ({@link ../../customers/components/new-customer-page}) — the
 * `useCreateCustomer` mutation, `Input` and `ImageUploader` — for a quick first-client
 * form. The full form lives at `/customers/new`.
 */
export function CustomerSetupStep() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createOrganization } = useCreateCustomer();

  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The logo is held in memory until the customer exists, then uploaded to it.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const previewUrlRef = useRef<string | undefined>(undefined);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const replacePreview = useCallback((file: File | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (file) {
      const next = URL.createObjectURL(file);
      previewUrlRef.current = next;
      setPreviewUrl(next);
    } else {
      previewUrlRef.current = undefined;
      setPreviewUrl(undefined);
    }
    setPendingFile(file);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: CreateCustomerRequest = {
        name: name.trim(),
        websiteUrl: website.trim() || undefined,
        contactInformation: {
          contacts: [],
          physicalAddress: { ...emptyAddress },
          mailingAddress: { ...emptyAddress },
          mailingAddressSameAsPhysical: true,
        },
      };

      const response = await createOrganization(payload);
      const createdId =
        (response as { organizationId?: string; id?: string } | null)?.organizationId ??
        (response as { id?: string } | null)?.id ??
        null;

      if (createdId && pendingFile) {
        try {
          await uploadWithAuth(`/api/organizations/${createdId}/image`, pendingFile);
        } catch {
          toast({
            title: 'Warning',
            description: 'Customer was created but logo upload failed',
            variant: 'warning',
          });
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.all }),
      ]);

      toast({ title: 'Customer created', description: `${name.trim()} has been created`, variant: 'success' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Failed to save customer',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, website, pendingFile, isSubmitting, createOrganization, queryClient, toast]);

  const saveDisabled = !name.trim() || isSubmitting;

  return (
    <div className="flex w-full flex-col gap-[var(--spacing-system-l)]">
      <p className="text-h4 text-ods-text-primary">
        Add your first client profile. Every device must belong to a Customer, so you&apos;ll need at least one to
        continue.
      </p>

      {/* Name + Website (left) / Logo (right) */}
      <div className="flex w-full flex-col items-start gap-[var(--spacing-system-l)] md:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
          <Input
            label="Customer Name"
            placeholder="Customer Name"
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={isSubmitting}
          />
          <Input
            label="Website URL"
            placeholder="https://www.website.com"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="w-full min-w-0 flex-1 self-stretch">
          <ImageUploader
            value={previewUrl}
            onChange={replacePreview}
            onRemove={() => replacePreview(null)}
            objectFit="contain"
            maxSize={5 * 1024 * 1024}
            fieldLabel="Customer Logo"
            label="Upload customer logo"
            description="Click to upload or drag and drop"
            alt={name || 'Customer logo'}
            // Pin height only on desktop, where it aligns with the two-input column on the left.
            dropzoneClassName="md:h-[148px]"
          />
        </div>
      </div>

      {/* Full form link (left) / mandatory hint + save (right) */}
      <div className="flex w-full flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
        <Link
          href="/customers/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center gap-[var(--spacing-system-xs)] text-ods-text-secondary transition-colors hover:text-ods-text-primary"
        >
          <ExternalLinkIcon size={24} className="shrink-0" />
          <span className="text-h4 underline">Full Organization Form</span>
        </Link>

        {/* On mobile the button comes first (full width) with the hint centered below it;
            on desktop the hint sits left of the button, matching the design grid. */}
        <div className="flex flex-1 flex-col gap-[var(--spacing-system-m)] md:flex-row md:items-center">
          <p className="order-2 flex-1 text-center text-[14px] font-medium leading-5 text-ods-text-secondary md:order-1 md:text-right">
            This step is mandatory
          </p>
          <Button
            variant="accent"
            onClick={handleSave}
            disabled={saveDisabled}
            className="order-1 w-full md:order-2 md:flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
