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
  ImageUploader,
  Input,
  Skeleton,
  TabSelector,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Controller } from 'react-hook-form';
import { AiSettingsPreviews } from '@/app/(app)/settings/ai-settings/components/previews/ai-settings-previews';
import {
  clientViewQueryKeys,
  useClientView,
  useResetClientView,
  useUpdateClientView,
} from '@/app/(app)/settings/ai-settings/hooks/use-client-view';
import { getDefaultClientView } from '@/app/(app)/settings/ai-settings/types/ai-settings';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { getFullImageUrl } from '@/lib/image-url';
import { routes } from '@/lib/routes';
import { useCustomerAppearanceForm } from './use-customer-appearance-form';

interface CustomerAiAssistantAppearanceProps {
  /** Organization the appearance is scoped to (edit mode only). */
  organizationId: string;
}

/** Imperative API the parent ("Save Customer") drives to persist this block. */
export interface CustomerAppearanceHandle {
  /** Validates the custom fields. Resolves false when the user must fix them first. */
  validate: () => Promise<boolean>;
  /** Persists the appearance: updates the override, or resets it when "use default" is on. */
  commit: () => Promise<void>;
}

/**
 * "AI-Assistant Appearance" block on the customer edit page. Mirrors the
 * settings/ai-settings client appearance, but scopes every read/write to a
 * specific `organizationId` instead of the tenant-wide default (null).
 *
 * It owns no Save button — the page's "Save Customer" drives persistence via the
 * `validate()` / `commit()` ref handle. "Use the default AI-Assistant appearance"
 * on means the customer inherits the tenant default (an existing override is
 * deleted immediately once the user confirms); off edits a per-customer override.
 */
export const CustomerAiAssistantAppearance = forwardRef<CustomerAppearanceHandle, CustomerAiAssistantAppearanceProps>(
  function CustomerAiAssistantAppearance({ organizationId }, ref) {
    const router = useRouter();
    const queryClient = useQueryClient();
    // Org-scoped override (null when the customer inherits the default).
    const { view: orgView, isLoading } = useClientView(organizationId);
    // Tenant-wide default, used for the "use default" previews.
    const { view: defaultView } = useClientView(null);
    // Opt out of auto-invalidation: commit() refetches once after the avatar
    // upload, so the preview never flickers the pre-upload image.
    const { update } = useUpdateClientView(organizationId, { invalidateOnSuccess: false });
    const { reset, isPending: isResetting } = useResetClientView(organizationId);
    const { toast } = useToast();

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

    const { form, avatarUrl, handleAvatarChange, handleAvatarRemove, commitAvatar } = useCustomerAppearanceForm({
      view: effectiveView,
    });

    const assistantName = form.watch('assistantName');
    const applicationTheme = form.watch('applicationTheme');
    const accentColor = form.watch('accentColor');

    // Persistence is driven by the page's "Save Customer" button.
    useImperativeHandle(
      ref,
      () => ({
        validate: () => (useDefault ? Promise.resolve(true) : form.trigger()),
        commit: async () => {
          if (useDefault) {
            // Drop the override only if one exists; otherwise nothing to do.
            if (orgView) await reset();
            return;
          }
          const values = form.getValues();

          const savedView = await update({
            assistantName: values.assistantName,
            applicationTheme: values.applicationTheme,
            accentColor: values.accentColor,
          });
          const clientViewId = savedView?.id ?? orgView?.id;
          if (clientViewId) await commitAvatar(clientViewId);
          // Single refetch after the avatar lands: the view and its avatar live
          // in separate stores, so this is the one point where both are current.
          // (Also keeps the cache fresh for an SPA revisit — no hard refresh.)
          await queryClient.invalidateQueries({ queryKey: clientViewQueryKeys.detail(organizationId) });
        },
      }),
      [useDefault, organizationId, orgView, form, update, reset, commitAvatar, queryClient],
    );

    const handleToggle = (checked: boolean) => {
      if (!checked) {
        // Switching to custom mode.
        setUseDefault(false);
        return;
      }
      // Switching to default: confirm first; the override is deleted on confirm.
      if (orgView) {
        setConfirmResetOpen(true);
        return;
      }
      setUseDefault(true);
    };

    const header = (
      <div className="flex flex-col gap-[var(--spacing-system-m)] sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-h2 text-ods-text-primary">AI-Assistant Appearance</h2>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(routes.settings.aiSettings({ tab: 'customer', edit: true }))}
          className="shrink-0"
        >
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
          <Skeleton className="h-64 w-full rounded-md" />
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
            avatarUrl={getFullImageUrl(
              fallbackDefault.assistantAvatar?.imageUrl,
              fallbackDefault.assistantAvatar?.hash,
            )}
            accentColor={fallbackDefault.accentColor}
            theme={fallbackDefault.applicationTheme}
          />
        ) : (
          <>
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

            <AiSettingsPreviews
              assistantName={assistantName || effectiveView.assistantName}
              avatarUrl={avatarUrl}
              accentColor={accentColor || effectiveView.accentColor}
              theme={applicationTheme}
            />
          </>
        )}

        <ConfirmDialog
          open={confirmResetOpen}
          onOpenChange={setConfirmResetOpen}
          title="Use default appearance?"
          description="The custom AI-Assistant appearance for this customer will be removed. They will use the tenant default instead."
          confirmLabel="Use default"
          variant="destructive"
          isPending={isResetting}
          pendingLabel="Removing..."
          onConfirm={async () => {
            try {
              await reset();
              setUseDefault(true);
              setConfirmResetOpen(false);
              toast({
                title: 'Saved',
                description: 'Customer now uses the default AI-Assistant appearance',
                variant: 'success',
              });
            } catch (err) {
              toast({
                title: 'Save failed',
                description: err instanceof Error ? err.message : 'Failed to remove the custom appearance',
                variant: 'destructive',
              });
            }
          }}
        />
      </div>
    );
  },
);
