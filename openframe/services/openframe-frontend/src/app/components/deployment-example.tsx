'use client'

import { useDeployment } from '@app/hooks/use-deployment'

/**
 * Example component showing how to use deployment detection
 */
export function DeploymentExample() {
  const { 
    isCloud, 
    isSelfHosted, 
    isDevelopment, 
    deploymentType, 
    hostname,
    isLoading 
  } = useDeployment()
  
  if (isLoading) {
    return <div>Detecting deployment environment...</div>
  }
  
  return (
    <div className="p-4 bg-ods-card border border-ods-border rounded-md">
      <h3 className="text-lg font-semibold text-ods-text-primary mb-2">
        Deployment Information
      </h3>
      
      <div className="space-y-2 text-sm text-ods-text-secondary">
        <div>
          <span className="font-medium">Type:</span> {deploymentType}
        </div>
        <div>
          <span className="font-medium">Hostname:</span> {hostname}
        </div>
        <div className="flex gap-4">
          <span className={isCloud ? 'text-green-500' : 'text-gray-500'}>
            ☁️ Cloud: {isCloud ? 'Yes' : 'No'}
          </span>
          <span className={isSelfHosted ? 'text-blue-500' : 'text-gray-500'}>
            🏠 Self-Hosted: {isSelfHosted ? 'Yes' : 'No'}
          </span>
          <span className={isDevelopment ? 'text-yellow-500' : 'text-gray-500'}>
            🔧 Development: {isDevelopment ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
      
      {/* Conditional rendering based on deployment type */}
      <div className="mt-4 p-3 bg-ods-bg rounded">
        {isCloud && (
          <div className="text-ods-text-primary">
            <h4 className="font-medium mb-1">Cloud Features</h4>
            <ul className="text-sm space-y-1 text-ods-text-secondary">
              <li>• Multi-tenant support</li>
              <li>• Automatic updates</li>
              <li>• Managed infrastructure</li>
              <li>• Usage-based billing</li>
            </ul>
          </div>
        )}
        
        {isSelfHosted && (
          <div className="text-ods-text-primary">
            <h4 className="font-medium mb-1">Self-Hosted Features</h4>
            <ul className="text-sm space-y-1 text-ods-text-secondary">
              <li>• Full data control</li>
              <li>• Custom integrations</li>
              <li>• On-premise deployment</li>
              <li>• No usage limits</li>
            </ul>
          </div>
        )}
        
        {isDevelopment && (
          <div className="text-ods-text-primary">
            <h4 className="font-medium mb-1">Development Mode</h4>
            <ul className="text-sm space-y-1 text-ods-text-secondary">
              <li>• Debug features enabled</li>
              <li>• Hot reload active</li>
              <li>• Mock data available</li>
              <li>• Extended logging</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Example of using deployment detection for feature flags
 */
export function FeatureGatedComponent() {
  const { isCloud, isSelfHosted } = useDeployment()
  
  return (
    <div>
      {/* Show upgrade prompts only in cloud */}
      {isCloud && (
        <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded">
          Upgrade to Pro ✨
        </button>
      )}
      
      {/* Show custom domain settings only for self-hosted */}
      {isSelfHosted && (
        <div className="p-4 border border-ods-border rounded">
          <h4 className="font-medium">Custom Domain Settings</h4>
          <input 
            type="text" 
            placeholder="your-domain.com" 
            className="mt-2 w-full px-3 py-2 border rounded"
          />
        </div>
      )}
    </div>
  )
}

/**
 * Example of using static helpers (non-hook)
 */
import { getDeploymentType, isCloudDeployment } from '@app/hooks/use-deployment'

export function someUtilityFunction() {
  // Can be used outside of React components
  const deploymentType = getDeploymentType()
  
  if (isCloudDeployment()) {
    // Apply cloud-specific logic
    console.log('Running cloud-specific code')
  }
  
  return deploymentType
}