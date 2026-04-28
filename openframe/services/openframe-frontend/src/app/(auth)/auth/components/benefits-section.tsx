'use client';

import { WaitlistForm } from '@flamingo-stack/openframe-frontend-core/components/features';
import {
  AutomateEverythingIcon,
  CutVendorCostsIcon,
  OpenFrameLogo,
  OpenFrameText,
  ReclaimProfitsIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons';
import { BenefitCard } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';

import { clearStoredRedditClickId, getStoredRedditClickId } from '@/lib/reddit-click-id';
import { runtimeEnv } from '@/lib/runtime-config';

export function AuthBenefitsSection() {
  const { toast } = useToast();
  const appMode = runtimeEnv.appMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = useCallback(
    async (email: string, phone?: string) => {
      setIsSubmitting(true);
      try {
        const rdtCid = getStoredRedditClickId();
        const response = await fetch('https://content-api.openframe.ai/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            phone: phone || undefined,
            platform: 'openframe',
            ...(rdtCid && { rdt_cid: rdtCid }),
          }),
        });

        if (response.ok) {
          setIsSuccess(true);
          clearStoredRedditClickId();
          toast({
            title: 'Success!',
            description: "You've been added to the waitlist.",
            variant: 'success',
            duration: 5000,
          });
          return;
        }

        const errorData = await response.json();

        if (errorData.code === 'DUPLICATE_EMAIL') {
          setIsSuccess(true);
          clearStoredRedditClickId();
          toast({
            title: 'Already Registered',
            description: 'This email is already on the waitlist',
            variant: 'info',
            duration: 5000,
          });
          return;
        }

        throw new Error(errorData.error || 'Failed to join waitlist');
      } catch (error) {
        if (error instanceof Error && !error.message.includes('DUPLICATE_EMAIL')) {
          toast({
            title: 'Submission Failed',
            description: 'Unable to join the waitlist. Please try again later.',
            variant: 'destructive',
            duration: 5000,
          });
        }
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [toast],
  );

  if (appMode === 'saas-shared') {
    return (
      <div className="bg-ods-card border-l border-ods-border w-full h-full min-h-screen flex items-center justify-center p-6 lg:p-20">
        <div className="flex flex-col items-center justify-center gap-10 w-full max-w-lg">
          {/* OpenFrame Logo */}
          <div className="flex items-center justify-center">
            <OpenFrameLogo
              className="h-10 w-auto mr-5"
              lowerPathColor="var(--color-accent-primary)"
              upperPathColor="var(--color-text-primary)"
            />
            <OpenFrameText textColor="#FAFAFA" style={{ width: '174px', height: '30px' }} />
          </div>

          {/* Waitlist Form Container */}
          <div className="bg-ods-card border border-ods-border rounded-md w-full p-4 md:p-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <h2 className="text-h2 text-ods-text-primary tracking-[-0.64px]">Get Early Access</h2>
                <p className="text-[18px] leading-6 text-ods-text-secondary">
                  Don't have access yet? Join our private beta to get your invitation code and start breaking free from
                  vendor lock-in.
                </p>
                <p className="text-[18px] leading-6 text-ods-text-secondary mt-2">
                  Enter your email below or join our OpenMSP Slack community to connect with other MSPs making the
                  switch.
                </p>
              </div>

              <WaitlistForm
                onRegister={handleRegister}
                isSubmitting={isSubmitting}
                isSuccess={isSuccess}
                geoApiUrl={null}
                submitLabel="Join Waitlist"
                successLabel="You're in!"
                privacyPolicyUrl="https://www.flamingo.run/privacy-policy"
                termsOfServiceUrl="https://www.flamingo.run/terms-of-service"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ods-card border-l border-ods-border w-full h-full min-h-screen flex items-center justify-center p-6 lg:p-20">
      <div className="flex flex-col items-center justify-center gap-10 w-full max-w-lg">
        {/* OpenFrame Logo */}
        <div className="flex items-center justify-center">
          <OpenFrameLogo
            className="h-10 w-auto"
            lowerPathColor="var(--color-accent-primary)"
            upperPathColor="var(--color-text-primary)"
          />
          <span className="p-4 font-heading fon-[Azeret_Mono] font-semibold text-[24px] text-ods-text-primary">
            OpenFrame{' '}
          </span>
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
  );
}
