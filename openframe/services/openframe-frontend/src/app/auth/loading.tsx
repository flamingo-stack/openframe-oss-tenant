'use client'

import { Skeleton } from '@flamingo/ui-kit/components/ui'

/**
 * Auth loading skeleton that matches the actual auth page EXACTLY:
 * - AuthLayout: min-h-screen bg-ods-bg flex flex-col lg:flex-row
 * - Left Side (50%): gap-10 p-6 lg:p-20 with two cards
 * - Right Side (50%): bg-ods-card border-l with logo + benefits
 */
export default function AuthLoading() {
  return (
    <div
      className="min-h-screen bg-ods-bg flex flex-col lg:flex-row"
      role="status"
      aria-label="Loading authentication page"
    >
      {/* Left Side - Auth Content (50% width) - matches AuthLayout exactly */}
      <div className="w-full lg:w-1/2 h-full min-h-screen flex flex-col justify-center gap-10 p-6 lg:p-20">

        {/* Create Organization Card - matches AuthChoiceSection first card */}
        <div className="bg-ods-card border border-ods-border rounded-sm p-10 relative">
          <div className="flex flex-col gap-6">
            {/* Header - matches h1 text-[32px] leading-10 + p text-[18px] leading-6 */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-56" /> {/* "Create Organization" - 32px/40px */}
              <Skeleton className="h-6 w-72" /> {/* subtitle - 18px/24px */}
            </div>

            {/* Form Fields - Two columns flex flex-col md:flex-row gap-6 */}
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex flex-col gap-1">
                <Skeleton className="h-5 w-32 mb-1" /> {/* Label */}
                <Skeleton className="h-[60px] w-full rounded-lg" /> {/* Input - matches min-h-[60px] */}
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <Skeleton className="h-5 w-20 mb-1" /> {/* Label */}
                <Skeleton className="h-[60px] w-full rounded-lg" /> {/* Input */}
              </div>
            </div>

            {/* Button Row - flex gap-6 items-center with empty left, button right */}
            <div className="flex gap-6 items-center">
              <div className="flex-1" />
              <div className="flex-1">
                <Skeleton className="h-12 w-full rounded-lg" /> {/* Continue button - h-12 default */}
              </div>
            </div>
          </div>
        </div>

        {/* Already Have Account Card - matches AuthChoiceSection second card */}
        <div className="bg-ods-bg border border-ods-border rounded-sm p-10 relative">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-72" /> {/* "Already Have an Account?" */}
              <Skeleton className="h-6 w-80" /> {/* subtitle */}
            </div>

            {/* Email Field - full width */}
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-12 mb-1" /> {/* "Email" label */}
              <Skeleton className="h-[60px] w-full rounded-lg" /> {/* Input */}
            </div>

            {/* Button Row - two buttons */}
            <div className="flex gap-6 items-center">
              <div className="flex-1">
                <Skeleton className="h-12 w-full rounded-lg" /> {/* Forgot password button */}
              </div>
              <div className="flex-1">
                <Skeleton className="h-12 w-full rounded-lg" /> {/* Continue button */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Benefits Section (50% width) - matches AuthLayout + AuthBenefitsSection */}
      <div className="w-full lg:w-1/2 h-full min-h-screen">
        {/* Inner wrapper - matches AuthBenefitsSection exactly */}
        <div className="bg-ods-card border-l border-ods-border w-full h-full min-h-screen flex items-center justify-center p-6 lg:p-20">
          <div className="flex flex-col items-center justify-center gap-10 w-full max-w-lg">
            {/* Logo row - matches OpenFrameLogo + text layout */}
            <div className="flex items-center justify-center">
              <Skeleton className="h-10 w-10 rounded" /> {/* Logo icon */}
              <Skeleton className="h-8 w-44 ml-4" /> {/* "OpenFrame" text with p-4 spacing */}
            </div>

            {/* Benefits container - matches bg-ods-bg border border-ods-border rounded-md */}
            <div className="bg-ods-bg border border-ods-border rounded-md w-full">
              {/* 3 BenefitCards with border-b between first two - auth-figma variant uses p-6, gap-4, text-[18px] leading-6 */}
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`p-6 ${i < 2 ? 'border-b border-ods-border' : ''}`}
                >
                  <div className="flex gap-4 items-start">
                    <Skeleton className="h-6 w-6 flex-shrink-0 rounded" /> {/* Icon - w-6 h-6 */}
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-40" /> {/* Title - text-[18px] leading-6 */}
                      <Skeleton className="h-6 w-full" /> {/* Description line 1 - text-[18px] leading-6 */}
                      <Skeleton className="h-6 w-11/12" /> {/* Description line 2 - text-[18px] leading-6 */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
