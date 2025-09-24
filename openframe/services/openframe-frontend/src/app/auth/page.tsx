'use client'

import nextDynamic from 'next/dynamic'

export const dynamic = 'force-dynamic'

const AuthPage = nextDynamic(
  () => import('@app/auth/pages/auth-page'),
  { ssr: false }
)

export default function Auth() {
  return <AuthPage />
}