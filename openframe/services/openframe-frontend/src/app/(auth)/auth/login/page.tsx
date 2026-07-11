'use client';

import dynamic from 'next/dynamic';
import LoginLoading from './loading';

const LoginPage = dynamic(() => import('@/app/(auth)/auth/pages/login-page'), {
  ssr: false,
  loading: () => <LoginLoading />,
});

export default function Login() {
  return <LoginPage />;
}
