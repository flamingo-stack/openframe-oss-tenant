'use client';

import { FlamingoLogo, OpenFrameLogo, OpenFrameText } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { authApiClient } from '@/lib/auth-api-client';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  useEffect(() => {
    if (!token) {
      router.replace(`/auth/error?error=${encodeURIComponent('Invalid verification link. Please try again.')}`);
      return;
    }

    authApiClient.verifyEmail(token).then(response => {
      if (!response.ok) {
        const message = response.data?.message || 'Verification failed. Please try again.';
        router.replace(`/auth/error?error=${encodeURIComponent(message)}`);
      } else {
        window.location.href = response.data?.redirectUrl || '/auth/login';
      }
    });
  }, [token, router]);

  return (
    <div className="min-h-screen bg-ods-bg flex flex-col items-center justify-between p-10">
      <div className="flex items-center gap-2">
        <OpenFrameLogo
          className="h-10 w-auto"
          lowerPathColor="var(--color-accent-primary)"
          upperPathColor="var(--color-text-primary)"
        />
        <OpenFrameText textColor="var(--ods-system-greys-white)" style={{ width: '144px', height: '24px' }} />
      </div>

      <div className="flex items-center justify-center gap-[6px] size-6">
        <span className="rounded-full bg-[#FAFAFA] animate-[dotTravel_0.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
        <span className="rounded-full bg-[#FAFAFA] animate-[dotTravel_0.8s_cubic-bezier(0.4,0,0.2,1)_0.27s_infinite]" />
        <span className="rounded-full bg-[#FAFAFA] animate-[dotTravel_0.8s_cubic-bezier(0.4,0,0.2,1)_0.54s_infinite]" />
        <style>{`
          @keyframes dotTravel {
            0%, 100% { width: 2px; height: 2px; opacity: 0.4; }
            50% { width: 4px; height: 4px; opacity: 0.9; }
          }
        `}</style>
      </div>

      <a
        href="https://flamingo.run"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-4 text-ods-text-secondary rounded-md bg-transparent hover:bg-[var(--ods-system-greys-background-hover)] transition-colors"
      >
        <span className="font-body text-[14px] font-medium leading-5">Powered by</span>
        <FlamingoLogo className="h-5 w-5" fill="currentColor" />
        <span className="font-heading text-[14px] font-semibold leading-5">Flamingo</span>
      </a>
    </div>
  );
}
