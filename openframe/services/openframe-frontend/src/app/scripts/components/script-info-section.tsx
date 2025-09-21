'use client'

import React from 'react'

interface ScriptInfoSectionProps {
  script: any | null
}

export function ScriptInfoSection({ script }: ScriptInfoSectionProps) {
  if (!script) {
    return (
      <div className="bg-ods-card border border-ods-border rounded-lg p-6">
        <div className="text-center text-ods-text-secondary">No script data available</div>
      </div>
    )
  }

  return (
    <div className="bg-ods-card border border-ods-border rounded-lg p-6">
      {/* Description */}
      {script.description && (
        <div className="mb-6">
          <p className="text-ods-text-primary font-medium">{script.description}</p>
          <p className="text-ods-text-secondary text-sm mb-1">Description</p>
        </div>
      )}
      
      {/* Script Properties */}
      <div className="border-t border-ods-border pt-4 grid grid-cols-1 md:grid-cols-4 gap-6">
        {script.shell && (
          <div>
            <p className="text-ods-text-primary font-medium">{script.shell}</p>
            <p className="text-ods-text-secondary text-sm mb-1">Shell Type</p>
          </div>
        )}
        {script.supported_platforms && (
          <div>
            <p className="text-ods-text-primary font-medium">
              {script.supported_platforms.join(', ')}
            </p>
            <p className="text-ods-text-secondary text-xs mt-1">Supported Platforms</p>
          </div>
        )}
        {script.category && (
          <div>
            <p className="text-ods-text-primary font-medium">{script.category}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Category</p>
          </div>
        )}
        {script.default_timeout && (
          <div>
            <p className="text-ods-text-primary font-medium">{script.default_timeout}</p>
            <p className="text-ods-text-secondary text-xs mt-1">Timeout (seconds)</p>
          </div>
        )}
      </div>
    </div>
  )
}