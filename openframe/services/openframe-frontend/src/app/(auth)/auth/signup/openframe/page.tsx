'use client';

import dynamic from 'next/dynamic';

const SignupOpenFramePage = dynamic(() => import('@/app/(auth)/auth/pages/signup-openframe-page'), { ssr: false });

export default function SignupOpenFrame() {
  return <SignupOpenFramePage />;
}
