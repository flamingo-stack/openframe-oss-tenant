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
    <div className="w-full lg:w-1/2 bg-ods-card border-t lg:border-t-0 lg:border-l border-ods-border flex flex-col items-center justify-center p-6 lg:p-20">
      <div className="w-full max-w-lg">
        {/* OpenFrame Logo */}
        <div className="h-10 mb-6 lg:mb-10 mx-auto flex items-center justify-center">
          <OpenFrameLogo className="h-8 lg:h-12 w-auto" lowerPathColor="#FFC008" upperPathColor="#ffffff" />
          <span className="ml-2 font-['Azeret_Mono'] font-bold text-[22px] lg:text-[36px] text-ods-text-primary">OpenFrame</span>
        </div>
        
        {/* Benefits Cards */}
        <div className="bg-ods-bg-secondary border border-ods-border rounded-md">
          <div className="flex flex-col">

            <BenefitCard
              icon={<CutVendorCostsIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              title="Cut Vendor Costs"
              description="Replace expensive proprietary tools with powerful open-source alternatives. Eliminate licensing fees and reduce operational overhead."
              className="border-b border-ods-border p-4 lg:p-6"
            />
            
            <BenefitCard
              icon={<AutomateEverythingIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              title="Automate Everything"
              description="AI-driven automation handles routine MSP tasks. Focus your team on high-value work while the system manages the repetitive processes."
              className="border-b border-ods-border p-4 lg:p-6"
            />
            
            <BenefitCard
              icon={<ReclaimProfitsIcon className="w-5 h-5 lg:w-6 lg:h-6" />}
              title="Reclaim Your Profits"
              description="Break free from vendor lock-in and subscription bloat. Keep more revenue in your pocket with transparent, open-source solutions."
              className="p-4 lg:p-6"
            />
          </div>
        </div>
      </div>
    </div>
  )
}