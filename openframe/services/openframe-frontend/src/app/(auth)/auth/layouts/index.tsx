'use client';

import { AuthBenefitsSection } from '../components/benefits-section';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/**
 * Unified layout wrapper for all OpenFrame auth pages
 * Provides consistent 50/50 split with proper responsive behavior and vertical centering
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-ods-bg flex flex-col lg:flex-row lg:h-screen lg:overflow-hidden">
      {/* Left Side - Auth Content (50% width) */}
      <div className="w-full lg:w-1/2 lg:h-full lg:overflow-y-auto">
        <div className="min-h-screen lg:min-h-full flex flex-col justify-center gap-10 p-6 lg:p-20">{children}</div>
      </div>

      {/* Right Side - Benefits Section (50% width) */}
      <div className="w-full lg:w-1/2 lg:h-full">
        <AuthBenefitsSection />
      </div>
    </div>
  );
}
