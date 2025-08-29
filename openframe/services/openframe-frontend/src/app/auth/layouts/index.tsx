'use client'

import { AuthBenefitsSection } from '../components/benefits-section'

interface AuthLayoutProps {
  children: React.ReactNode
}

/**
 * Unified layout wrapper for all OpenFrame auth pages
 * Provides consistent 50/50 split with proper responsive behavior and vertical centering
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row">
      {/* Left Side - Auth Content (50% width) */}
      <div className="w-full lg:w-1/2 h-full min-h-screen flex flex-col justify-center gap-10 p-6 lg:p-20">
        {children}
      </div>
      
      {/* Right Side - Benefits Section (50% width) */}
      <div className="w-full lg:w-1/2 h-full min-h-screen">
        <AuthBenefitsSection />
      </div>
    </div>
  )
}