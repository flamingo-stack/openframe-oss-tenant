import React from 'react'
import { MicrosoftIcon, GoogleLogo, SlackIcon } from '@flamingo/ui-kit/components/icons'

/**
 * Get the appropriate icon component for an SSO provider
 * @param providerKey - The provider key (e.g., 'microsoft', 'google', 'slack')
 * @param className - Optional className for the icon (defaults to 'h-6 w-6 shrink-0')
 * @returns React element for the provider icon, or null if provider is not supported
 */
export function getProviderIcon(providerKey: string, className: string = 'h-6 w-6 shrink-0'): React.ReactElement | null {
  const provider = providerKey.toLowerCase()

  switch (provider) {
    case 'microsoft':
      return <MicrosoftIcon className={className} />
    case 'google':
      return <GoogleLogo className={className} />
    case 'slack':
      return <SlackIcon className={className} />
    default:
      return null
  }
}
