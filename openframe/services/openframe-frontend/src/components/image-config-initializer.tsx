'use client'

import { useEffect } from 'react'
import { configureBatchImageFetch } from '@flamingo-stack/openframe-frontend-core/hooks'
import { configureAuthenticatedImage } from '@flamingo-stack/openframe-frontend-core/hooks'
import { runtimeEnv } from '../lib/runtime-config'

/**
 * ImageConfigInitializer
 *
 * Initializes global configuration for image fetching hooks in ui-kit.
 * Must be rendered once at the app root level.
 *
 * Configures:
 * - useBatchImages hook for batch image fetching
 * - useAuthenticatedImage hook for single image fetching
 *
 * Uses OpenFrame runtime config to set:
 * - tenantHostUrl: Base URL for API calls
 * - enableDevMode: Enable Bearer token from localStorage in dev
 * - accessTokenKey: localStorage key for access token
 */
export function ImageConfigInitializer() {
  useEffect(() => {
    const config = {
      tenantHostUrl: runtimeEnv.tenantHostUrl(),
      enableDevMode: runtimeEnv.enableDevTicketObserver(),
      accessTokenKey: 'of_access_token'
    }

    // Configure both hooks with same settings
    configureBatchImageFetch(config)
    configureAuthenticatedImage(config)

    console.log('[ImageConfig] Initialized image fetching configuration:', {
      tenantHostUrl: config.tenantHostUrl,
      enableDevMode: config.enableDevMode
    })
  }, [])

  return null // This component only runs configuration, no UI
}
