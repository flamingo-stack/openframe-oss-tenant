'use client';

import nextDynamic from 'next/dynamic';
import AuthLoading from './loading';

export const dynamic = 'force-dynamic';

const AuthPage = nextDynamic(() => import('@/app/auth/pages/auth-page'), {
  ssr: false,
  loading: () => <AuthLoading />,
});

export default function Auth() {
  return <AuthPage />;
}
