'use client';

import {
  MonitorIcon,
  MoonStarIcon,
  PenEditIcon,
  Sun01Icon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  CheckboxBlock,
  ColorPickerInput,
  CompactPageLoader,
  ImageUploader,
  Input,
  TabSelector,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { AiSettingsPreviews } from '@/app/(app)/settings/ai-settings/components/previews/ai-settings-previews';
import {
  useClientView,
  useResetClientView,
  useUpdateClientView,
} from '@/app/(app)/settings/ai-settings/hooks/use-client-view';
import { getDefaultClientView } from '@/app/(app)/settings/ai-settings/types/ai-settings';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { getFullImageUrl } from '@/lib/image-url';
import { CUSTOMER_APPEARANCE_FORM_ID } from './customer-appearance.types';
import { useCustomerAppearanceForm } from './use-customer-appearance-form';

interface CustomerAiAssistantAppearanceProps {
  /** Organization the appearance is scoped to (edit mode only). */
  organizationId: string;
}

/**
 * "AI-Assistant Appearance" block on the customer edit page. Mirrors the
 * settings/ai-settings client appearance, but scopes every read/write to a
 * specific `organizationId` instead of the tenant-wide default (null).
 *
 * "Use the default AI-Assistant appearance" on means the customer inherits the
 * tenant default — an existing override is removed via resetClientView. Off
 * reveals the per-customer fields and an independent Save.
 */
export function CustomerAiAssistantAppearance({ organizationId }: CustomerAiAssistantAppearanceProps) {
  const router = useRouter();
  const { toast } = useToast();
  // Org-scoped override (null when the customer inherits the default).
  const { view: orgView, isLoading } = useClientView(organizationId);
  // Tenant-wide default, used for the "use default" previews.
  const { view: defaultView } = useClientView(null);
  const { update, isPending: isSaving } = useUpdateClientView(organizationId);
  const { reset, isPending: isResetting } = useResetClientView(organizationId);

  const [useDefault, setUseDefault] = useState(true);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Seed the toggle once the org record has loaded: an existing override starts
  // in custom mode, otherwise we default to "use default".
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || isLoading) return;
    seededRef.current = true;
    setUseDefault(!orgView);
  }, [isLoading, orgView]);

  const effectiveView = orgView ?? defaultView ?? getDefaultClientView(organizationId);
  const fallbackDefault = defaultView ?? getDefaultClientView(null);

  const { form, avatarUrl, handleAvatarChange, handleAvatarRemove, handleSubmit } = useCustomerAppearanceForm({
    view: effectiveView,
    onSubmit: async values => {
      try {
        await update({
          assistantName: values.assistantName,
          applicationTheme: values.applicationTheme,
          accentColor: values.accentColor,
        });
        toast({ title: 'Saved', description: 'AI assistant appearance updated', variant: 'success' });
      } catch (err) {
        toast({
          title: 'Save failed',
          description: err instanceof Error ? err.message : 'Failed to save appearance',
          variant: 'destructive',
        });
      }
    },
  });

  const assistantName = form.watch('assistantName');
  const applicationTheme = form.watch('applicationTheme');
  const accentColor = form.watch('accentColor');

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      // Switching to custom mode never touches the backend until Save.
      setUseDefault(false);
      return;
    }
    // Switching to default: drop the override if one exists, otherwise just flip.
    if (orgView) {
      setConfirmResetOpen(true);
      return;
    }
    setUseDefault(true);
  };

  const handleConfirmReset = async () => {
    try {
      await reset();
      setUseDefault(true);
      toast({
        title: 'Reverted to default',
        description: 'This customer now uses the default appearance',
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Reset failed',
        description: err instanceof Error ? err.message : 'Failed to revert to default',
        variant: 'destructive',
      });
    } finally {
      setConfirmResetOpen(false);
    }
  };

  const header = (
    <div className="flex flex-col gap-[var(--spacing-system-m)] sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-h2 text-ods-text-primary">AI-Assistant Appearance</h2>
      <Button type="button" variant="outline" onClick={() => router.push('/settings/ai-settings')} className="shrink-0">
        <PenEditIcon className="size-5 text-ods-text-secondary" />
        Edit Default Appearance
      </Button>
    </div>
  );

  const toggle = (
    <CheckboxBlock
      id="use-default-ai-appearance"
      label="Use the default AI-Assistant appearance"
      description="Uses the nickname, theme, accent color, and avatar from global settings."
      checked={useDefault}
      onCheckedChange={checked => handleToggle(Boolean(checked))}
    />
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        {header}
        {toggle}
        <CompactPageLoader />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)] max-md:[&_input]:!text-[14px]">
      {header}
      {toggle}

      {useDefault ? (
        <AiSettingsPreviews
          assistantName={fallbackDefault.assistantName}
          avatarUrl={getFullImageUrl(fallbackDefault.assistantAvatar?.imageUrl, fallbackDefault.assistantAvatar?.hash)}
          accentColor={fallbackDefault.accentColor}
          theme={fallbackDefault.applicationTheme}
        />
      ) : (
        <>
          <form id={CUSTOMER_APPEARANCE_FORM_ID} onSubmit={handleSubmit} className="contents">
            <div className="flex flex-col gap-[var(--spacing-system-l)] md:flex-row md:items-start">
              <div className="flex min-w-0 flex-1 flex-col gap-[var(--spacing-system-l)]">
                <Controller
                  name="assistantName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Input {...field} label="Custom Assistant Name" error={fieldState.error?.message} />
                  )}
                />

                <Controller
                  name="applicationTheme"
                  control={form.control}
                  render={({ field }) => (
                    <TabSelector
                      label="Custom Application Theme"
                      variant="primary"
                      value={field.value}
                      onValueChange={field.onChange}
                      items={[
                        { id: 'DARK', label: 'Dark', icon: <MoonStarIcon className="size-5" /> },
                        { id: 'LIGHT', label: 'Light', icon: <Sun01Icon className="size-5" /> },
                        { id: 'SYSTEM', label: 'System', icon: <MonitorIcon className="size-5" /> },
                      ]}
                    />
                  )}
                />

                <div className="flex flex-col gap-1">
                  <p className="text-h3 text-ods-text-primary">Custom Accent Color</p>
                  <Controller
                    name="accentColor"
                    control={form.control}
                    render={({ field }) => <ColorPickerInput value={field.value} onChange={field.onChange} />}
                  />
                </div>
              </div>

              <div className="w-full shrink-0 md:w-[274px]">
                <ImageUploader
                  fieldLabel="Custom Assistant Avatar"
                  value={avatarUrl}
                  onChange={handleAvatarChange}
                  onRemove={handleAvatarRemove}
                  className="[&>div]:!h-[154px] md:[&>div]:!h-[148px] [&_button]:size-10 [&_button]:p-2 md:[&_button]:size-12 md:[&_button]:p-3"
                  alt={assistantName || effectiveView.assistantName}
                />
              </div>
            </div>
          </form>

          <AiSettingsPreviews
            assistantName={assistantName || effectiveView.assistantName}
            avatarUrl={avatarUrl}
            accentColor={accentColor || effectiveView.accentColor}
            theme={applicationTheme}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              form={CUSTOMER_APPEARANCE_FORM_ID}
              variant="accent"
              disabled={isSaving}
              loading={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save AI Appearance'}
            </Button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Use default appearance?"
        description="This removes the custom AI-Assistant appearance for this customer. They will use the tenant default instead."
        confirmLabel="Use default"
        pendingLabel="Reverting..."
        isPending={isResetting}
        variant="destructive"
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
