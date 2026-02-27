'use client';

import dynamic from 'next/dynamic';

const SignupPage = dynamic(() => import('@/app/auth/pages/signup-page'), { ssr: false });

export default function Signup() {
  return <SignupPage />;
}
