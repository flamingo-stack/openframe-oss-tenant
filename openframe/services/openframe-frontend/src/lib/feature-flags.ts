import { runtimeEnv } from './runtime-config'

/**
 * Feature flags management
 * Controls feature availability across the application
 */
export const featureFlags = {
  /**
   * Organization Images Feature
   * Controls the display and upload of organization images/logos
   */
  organizationImages: {
    enabled(): boolean {
      return runtimeEnv.featureOrganizationImages()
    },
    uploadEnabled(): boolean {
      return this.enabled()
    },
    displayEnabled(): boolean {
      return this.enabled()
    }
  },
  ssoAutoAllow: {
    enabled(): boolean {
      return runtimeEnv.featureSSOAllowDomain()
    }
  },
} as const

/**
 * Feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags