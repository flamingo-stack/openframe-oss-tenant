'use client';

import { DetailPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { CommandBox } from '@flamingo-stack/openframe-frontend-core/components/features';
import type { AutocompleteOption } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Autocomplete } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { DEFAULT_OS_PLATFORM, type OSPlatformId } from '@flamingo-stack/openframe-frontend-core/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Copy, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { graphql, useLazyLoadQuery } from 'react-relay';
import { z } from 'zod';
import type { newDeviceContentQuery as NewDeviceContentQueryType } from '@/__generated__/newDeviceContentQuery.graphql';
import { OrgAvatar } from '@/app/components/shared';
import { OsPlatformSelector } from '@/app/components/shared/os-platform-selector';
import { isValidTag, type TagEntryWithId, TagsEditor } from '@/app/components/shared/tags';
import { AVAILABLE_PLATFORMS, DISABLED_PLATFORMS } from '@/lib/platforms';
import { AntivirusWarning } from '../components/antivirus-warning';
import { useInstallCommand } from '../hooks/use-install-command';

const newDeviceContentQuery = graphql`
  query newDeviceContentQuery($first: Int!) {
    organizations(first: $first) {
      edges {
        node {
          id
          organizationId
          name
          isDefault
          image {
            imageUrl
          }
        }
      }
    }
  }
`;

const newDeviceSchema = z.object({
  organizationId: z.string().min(1, 'Organization is required'),
  platform: z.custom<OSPlatformId>(),
});

type NewDeviceFormValues = z.infer<typeof newDeviceSchema>;

export function NewDeviceContent() {
  const router = useRouter();
  const { toast } = useToast();

  // Relay query for organizations
  const data = useLazyLoadQuery<NewDeviceContentQueryType>(
    newDeviceContentQuery,
    { first: 100 },
    { fetchPolicy: 'store-or-network' },
  );

  const orgs = useMemo(() => {
    return (data.organizations?.edges ?? []).map(edge => ({
      id: edge.node.id,
      organizationId: edge.node.organizationId,
      name: edge.node.name,
      isDefault: edge.node.isDefault,
      imageUrl: edge.node.image?.imageUrl ?? undefined,
    }));
  }, [data.organizations?.edges]);

  const [tags, setTags] = useState<TagEntryWithId[]>([]);

  const form = useForm<NewDeviceFormValues>({
    resolver: zodResolver(newDeviceSchema),
    defaultValues: { organizationId: '', platform: DEFAULT_OS_PLATFORM },
  });

  const organizationId = useWatch({ control: form.control, name: 'organizationId' });
  const platform = useWatch({ control: form.control, name: 'platform' });

  const validTags = useMemo(() => {
    const seen = new Set<string>();
    return tags.flatMap(t => {
      if (!t.key || !isValidTag(t.key)) return [];
      if (seen.has(t.key)) return [];
      const validValues = t.values.filter(isValidTag);
      if (validValues.length === 0) return [];
      seen.add(t.key);
      return [{ ...t, values: validValues }];
    });
  }, [tags]);

  const { command, initialKey } = useInstallCommand({ organizationId, platform, tags: validTags });

  const orgOptions: AutocompleteOption[] = useMemo(
    () => orgs.map(o => ({ label: o.name, value: o.organizationId })),
    [orgs],
  );

  const selectedOrg = orgs.find(o => o.organizationId === organizationId);

  // Set default org on data load
  useEffect(() => {
    if (orgs.length > 0 && !organizationId) {
      const defaultOrg = orgs.find(o => o.isDefault) || orgs[0];
      if (defaultOrg) form.setValue('organizationId', defaultOrg.organizationId);
    }
  }, [orgs, organizationId, form]);

  const validateBeforeAction = useCallback(async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast({ title: 'Validation error', description: 'Please select an organization', variant: 'destructive' });
      return false;
    }
    if (!initialKey) {
      toast({ title: 'Secret unavailable', description: 'Registration secret not loaded yet', variant: 'destructive' });
      return false;
    }
    const filledTags = tags.filter(t => t.key);
    const hasInvalidTags = filledTags.some(t => !isValidTag(t.key) || t.values.some(v => !isValidTag(v)));
    if (hasInvalidTags) {
      toast({
        title: 'Invalid tags',
        description: 'Tag keys and values can only contain letters, numbers, underscores, hyphens, and dots',
        variant: 'destructive',
      });
      return false;
    }
    const keys = filledTags.map(t => t.key);
    if (new Set(keys).size !== keys.length) {
      toast({
        title: 'Duplicate tags',
        description: 'Each tag key must be unique. Please remove duplicate tags.',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  }, [form, initialKey, tags, toast]);

  const copyCommand = useCallback(async () => {
    if (!(await validateBeforeAction())) return;
    try {
      await navigator.clipboard.writeText(command);
      toast({ title: 'Command copied', description: 'Installer command copied to clipboard', variant: 'default' });
    } catch {
      toast({ title: 'Copy failed', description: 'Could not copy command', variant: 'destructive' });
    }
  }, [command, toast, validateBeforeAction]);

  const runOnCurrentMachine = useCallback(async () => {
    if (!(await validateBeforeAction())) return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isMac = userAgent.includes('mac');
    const isWindows = userAgent.includes('win');
    const isLinux = userAgent.includes('linux');

    if (isMac && platform !== 'darwin') {
      toast({
        title: 'Platform Mismatch',
        description: 'Please select macOS platform for your current machine',
        variant: 'destructive',
      });
      return;
    }
    if (isWindows && platform !== 'windows') {
      toast({
        title: 'Platform Mismatch',
        description: 'Please select Windows platform for your current machine',
        variant: 'destructive',
      });
      return;
    }
    if (isLinux && platform !== 'darwin') {
      toast({
        title: 'Platform Mismatch',
        description: 'Please select macOS/Linux platform for your current machine',
        variant: 'destructive',
      });
      return;
    }

    try {
      let scriptContent: string;
      let fileName: string;
      let mimeType: string;

      if (platform === 'windows') {
        scriptContent = `# OpenFrame Client Installation Script\n# Run this script as Administrator\n\n${command}\n\nWrite-Host "OpenFrame client installation complete!" -ForegroundColor Green\nWrite-Host "Press any key to exit..."\n$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")\n`;
        fileName = 'install-openframe.ps1';
        mimeType = 'application/x-powershell';
      } else {
        scriptContent = `#!/bin/bash\n# OpenFrame Client Installation Script\n# This script requires sudo privileges\n\n${command}\n\necho ""\necho "OpenFrame client installation complete!"\n`;
        fileName = 'install-openframe.sh';
        mimeType = 'application/x-sh';
      }

      const blob = new Blob([scriptContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Script Downloaded',
        description: isWindows
          ? 'Right-click the file and select "Run with PowerShell" as Administrator'
          : 'Open Terminal, navigate to Downloads, run: chmod +x install-openframe.sh && ./install-openframe.sh',
        variant: 'default',
        duration: 8000,
      });
    } catch {
      toast({
        title: 'Download failed',
        description: 'Could not generate installation script',
        variant: 'destructive',
      });
    }
  }, [command, platform, toast, validateBeforeAction]);

  return (
    <DetailPageContainer
      title="New Device"
      backButton={{ label: 'Back to Devices', onClick: () => router.push('/devices') }}
      padding="none"
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Controller
            name="organizationId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Autocomplete
                options={orgOptions}
                value={field.value || null}
                onChange={val => field.onChange(val ?? '')}
                label="Select Organization"
                placeholder="Choose organization"
                loading={false}
                error={fieldState.error?.message}
                startAdornment={
                  selectedOrg ? (
                    <span className="group-has-[:focus]:hidden">
                      <OrgAvatar imageUrl={selectedOrg.imageUrl} name={selectedOrg.name} />
                    </span>
                  ) : undefined
                }
                renderOption={option => {
                  const org = orgs.find(o => o.organizationId === option.value);
                  return (
                    <div className="flex items-center gap-2 w-full">
                      <OrgAvatar imageUrl={org?.imageUrl} name={org?.name ?? option.label} />
                      <span>{option.label}</span>
                    </div>
                  );
                }}
              />
            )}
          />
          <Controller
            name="platform"
            control={form.control}
            render={({ field }) => (
              <OsPlatformSelector
                value={field.value}
                onValueChange={field.onChange}
                label="Select Platform"
                className="md:col-span-2"
                disabledPlatforms={DISABLED_PLATFORMS}
                options={AVAILABLE_PLATFORMS.map(p => ({ platformId: p.id }))}
              />
            )}
          />
        </div>

        <TagsEditor tags={tags} onTagsChange={setTags} addLabel="Add Device Tag" />

        <CommandBox
          title="Device Add Command"
          command={command}
          primaryAction={{
            label: 'Copy Command',
            onClick: copyCommand,
            icon: <Copy className="w-5 h-5" />,
            variant: 'primary',
          }}
          secondaryAction={{
            label: 'Run on Current Machine',
            onClick: runOnCurrentMachine,
            icon: <Play className="w-5 h-5" />,
            variant: 'outline',
          }}
        />

        <AntivirusWarning platform={platform} />
      </div>
    </DetailPageContainer>
  );
}
