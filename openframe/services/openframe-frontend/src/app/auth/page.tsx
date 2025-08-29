'use client'

import dynamic from 'next/dynamic'

const AuthPage = dynamic(
  () => import('@app/auth/pages/auth-page'),
  { ssr: false }
)

export default function Auth() {
  return <AuthPage />
}