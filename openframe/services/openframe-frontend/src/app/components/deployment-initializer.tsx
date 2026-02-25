'use client';

import { useEffect } from 'react';
import { useDeployment } from '@/app/hooks/use-deployment';

/**
 * Deployment Initializer Component
 * Initializes deployment detection once on app mount
 * Should be placed at the root level of the application
 */
export function DeploymentInitializer() {
  const { isInitialized, deployment } = useDeployment();

  useEffect(() => {
    if (isInitialized && deployment) {
      // Log deployment info once initialized
      console.log('🌐 [DeploymentInitializer] Application deployment detected:', {
        type: deployment.type,
        hostname: deployment.hostname,
        isCloud: deployment.isCloud,
        isSelfHosted: deployment.isSelfHosted,
        isDevelopment: deployment.isDevelopment,
      });

      // Add deployment type to document for debugging/styling
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-deployment', deployment.type);
        document.documentElement.setAttribute('data-hostname', deployment.hostname);
      }
    }
  }, [isInitialized, deployment]);

  // This component doesn't render anything
  return null;
}
