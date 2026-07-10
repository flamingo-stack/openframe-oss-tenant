'use client';

import dynamic from 'next/dynamic';
import SignupLoading from './loading';

const SignupPage = dynamic(() => import('@/app/(auth)/auth/pages/signup-page'), {
  ssr: false,
  loading: () => <SignupLoading />,
});

export default function Signup() {
  return <SignupPage />;
}
