'use client'

import { BenefitCard } from '@flamingo/ui-kit/components/ui'
import { 
  OpenFrameLogo, 
  CutVendorCostsIcon, 
  AutomateEverythingIcon, 
  ReclaimProfitsIcon 
} from '@flamingo/ui-kit/components/icons'

/**
 * Shared benefits section for all auth screens
 * Displays OpenFrame logo and three benefit cards
 */
export function AuthBenefitsSection() {
  return (
    <div className="bg-ods-card border-l border-ods-border w-full h-full min-h-screen flex items-center justify-center p-6 lg:p-20">
      <div className="flex flex-col items-center justify-center gap-10 w-full max-w-lg">
        {/* OpenFrame Logo */}
        <div className="flex items-center justify-center">
          <OpenFrameLogo className="h-10 w-auto" lowerPathColor="var(--color-accent-primary)" upperPathColor="var(--color-text-primary)" />
          <span className="p-4 font-heading fon-[Azeret_Mono] font-semibold text-[24px] text-ods-text-primary">OpenFrame </span>
        </div>
        
        {/* Benefits Container */}
        <div className="bg-ods-bg border border-ods-border rounded-md w-full">
          <div className="flex flex-col">
            <BenefitCard
              icon={<CutVendorCostsIcon className="w-6 h-6" />}
              title="Cut Vendor Costs"
              description="Replace expensive proprietary tools with powerful open-source alternatives. Eliminate licensing fees and reduce operational overhead."
              variant="auth-figma"
              className="border-b border-ods-border"
            />
            
            <BenefitCard
              icon={<AutomateEverythingIcon className="w-6 h-6" />}
              title="Automate Everything"
              description="AI-driven automation handles routine MSP tasks. Focus your team on high-value work while the system manages the repetitive processes."
              variant="auth-figma"
              className="border-b border-ods-border"
            />
            
            <BenefitCard
              icon={<ReclaimProfitsIcon className="w-6 h-6" />}
              title="Reclaim Your Profits"
              description="Break free from vendor lock-in and subscription bloat. Keep more revenue in your pocket with transparent, open-source solutions."
              variant="auth-figma"
            />
          </div>
        </div>
      </div>
    </div>
  )
}