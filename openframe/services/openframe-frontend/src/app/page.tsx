'use client'

import dynamic from 'next/dynamic'

const HomePage = dynamic(
  () => import('./home-page'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-ods-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ods-text-primary mb-4">
            Loading...
          </h1>
          <p className="text-ods-text-secondary">
            Please wait while we prepare your experience
          </p>
        </div>
      </div>
    )
  }
)

export default function Home() {
  return <HomePage />
}