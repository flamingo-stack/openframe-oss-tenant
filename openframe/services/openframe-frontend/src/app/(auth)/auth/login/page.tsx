'use client';

import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('@/app/(auth)/auth/pages/login-page'), { ssr: false });

export default function Login() {
  return <LoginPage />;
}
