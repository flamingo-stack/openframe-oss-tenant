'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { type DeploymentInfo, type DeploymentType, detectDeployment } from '@/lib/deployment-detector';

/**
 * Deployment Store
 * Stores deployment detection result globally using Zustand
 */
interface DeploymentState {
  // State
  deployment: DeploymentInfo | null;
  isInitialized: boolean;

  // Actions
  initialize: () => void;
  reset: () => void;
}

const useDeploymentStore = create<DeploymentState>()(
  devtools(
    set => ({
      // Initial state
      deployment: null,
      isInitialized: false,

      // Actions
      initialize: () => {
        // Only initialize once
        const currentState = useDeploymentStore.getState();
        if (currentState.isInitialized) {
          console.log('🌐 [Deployment] Already initialized, skipping detection');
          return;
        }

        // Detect deployment
        const deploymentInfo = detectDeployment();
        console.log('🌐 [Deployment] Detected:', deploymentInfo);

        set({
          deployment: deploymentInfo,
          isInitialized: true,
        });
      },

      reset: () => {
        console.log('🌐 [Deployment] Resetting deployment detection');
        set({
          deployment: null,
          isInitialized: false,
        });
      },
    }),
    {
      name: 'deployment-store', // Redux DevTools name
    },
  ),
);

/**
 * Hook for deployment detection
 * Initializes once on first use and returns cached result thereafter
 */
export function useDeployment() {
  const { deployment, isInitialized, initialize } = useDeploymentStore();
  const [isLoading, setIsLoading] = useState(!isInitialized);

  useEffect(() => {
    // Initialize deployment detection if not already done
    if (!isInitialized) {
      console.log('🌐 [useDeployment] Initializing deployment detection...');

      // Small delay to ensure we're in browser environment
      const timer = setTimeout(() => {
        initialize();
        setIsLoading(false);
      }, 0);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [isInitialized, initialize]);

  // Convenience getters
  const isCloud = deployment?.isCloud ?? false;
  const isSelfHosted = deployment?.isSelfHosted ?? false;
  const isDevelopment = deployment?.isDevelopment ?? false;
  const deploymentType = deployment?.type ?? 'development';
  const hostname = deployment?.hostname ?? 'localhost';

  return {
    // Full deployment info
    deployment,

    // Loading state
    isLoading,
    isInitialized,

    // Convenience booleans
    isCloud,
    isSelfHosted,
    isDevelopment,

    // Deployment details
    deploymentType,
    hostname,

    // Actions (rarely needed)
    reset: useDeploymentStore.getState().reset,
  };
}

/**
 * Static helper to get deployment info without hook
 * Useful for non-component contexts
 * Note: May return null if not yet initialized
 */
export function getDeployment(): DeploymentInfo | null {
  return useDeploymentStore.getState().deployment;
}

/**
 * Static helper to check if cloud deployment
 */
export function isCloudDeployment(): boolean {
  return useDeploymentStore.getState().deployment?.isCloud ?? false;
}

/**
 * Static helper to check if self-hosted deployment
 */
export function isSelfHostedDeployment(): boolean {
  return useDeploymentStore.getState().deployment?.isSelfHosted ?? false;
}

/**
 * Static helper to check if development environment
 */
export function isDevelopmentDeployment(): boolean {
  return useDeploymentStore.getState().deployment?.isDevelopment ?? true;
}

/**
 * Static helper to get deployment type
 */
export function getDeploymentType(): DeploymentType {
  return useDeploymentStore.getState().deployment?.type ?? 'development';
}

// Export types
export type { DeploymentInfo, DeploymentType };
