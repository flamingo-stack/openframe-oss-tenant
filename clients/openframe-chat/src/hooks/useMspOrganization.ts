import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useCallback } from 'react';
import { getFullImageUrl } from '../utils/image-url';
import { isTauri } from '../utils/runtime';
import { useAuthenticatedImage } from './useAuthenticatedImage';
import { useTenantInfoQuery } from './useTenantInfoQuery';

/** Prefix a bare host (e.g. "www.techflow.com") with https so it's treated as an
 *  absolute URL rather than a path relative to the app. */
function toExternalHref(site: string): string {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

/**
 * MSP organization branding (name, website, logo) shared by the welcome
 * screen's `MspOrganizationCard` and the chat header's MSP section.
 *
 * Logo bytes sit behind a Bearer-protected endpoint, so resolve them the same
 * way as the assistant avatar (authenticated fetch → object URL).
 */
export function useMspOrganization() {
  const { toast } = useToast();

  const { data: tenantInfo, isLoading: isTenantLoading } = useTenantInfoQuery({ enabled: true });
  const rawLogoUrl = tenantInfo?.image ? getFullImageUrl(tenantInfo.image.imageUrl, tenantInfo.image.hash) : undefined;
  const { url: logoUrl, isLoading: isLogoLoading } = useAuthenticatedImage(rawLogoUrl);
  const name = tenantInfo?.name?.trim() || undefined;
  const website = tenantInfo?.website?.trim() || undefined;

  // Stay loading until both tenant info and the logo blob resolve, so consumers
  // keep the skeleton instead of rendering the card before the logo arrives.
  const isLoading = isTenantLoading || isLogoLoading;

  // Open the MSP website in the system browser. The Tauri WKWebview ignores
  // window.open, so use the opener plugin there (toasting on failure); fall back
  // to window.open in the browser (frontend:dev).
  const openWebsite = useCallback(() => {
    if (!website) return;
    const url = toExternalHref(website);
    if (!isTauri) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    openUrl(url).catch((err: unknown) => {
      toast({
        title: 'Could not open link',
        description: err instanceof Error ? err.message : 'Failed to open the website',
        variant: 'destructive',
      });
    });
  }, [website, toast]);

  return {
    name,
    website,
    logoUrl,
    isLoading,
    openWebsite: website ? openWebsite : undefined,
  };
}
