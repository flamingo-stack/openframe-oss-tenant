'use client'

/**
 * DEPRECATED: This component is no longer used.
 * 
 * We now use proper Next.js file-based routing instead of hacky state management:
 * - /auth/page.tsx handles the choice screen
 * - /auth/signup/page.tsx handles the signup screen  
 * - /auth/login/page.tsx handles the login screen
 * 
 * This approach is bulletproof and follows Next.js best practices.
 */

export function OpenFrameAuthPage() {
  return (
    <div className="min-h-screen bg-ods-bg flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-ods-text-primary mb-4">
          This component is deprecated
        </h1>
        <p className="text-ods-text-secondary">
          Navigation is now handled by proper Next.js file-based routing.
        </p>
      </div>
    </div>
  )
}