import type { Metadata } from 'next'
import { PublicEnvScript } from 'next-runtime-env'
import { Suspense } from 'react'
import './globals.css'
import '@flamingo/ui-kit/styles'
import { azeretMono, dmSans } from '@flamingo/ui-kit/fonts'
import { Toaster } from '@flamingo/ui-kit/components/ui'
import { DevTicketObserver } from './auth/components/dev-ticket-observer'
import { DeploymentInitializer } from './components/deployment-initializer'
import { RouteGuard } from '../components/route-guard'

export const metadata: Metadata = {
  title: 'OpenFrame',
  description: 'Open-source application framework for device management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${azeretMono.variable} ${dmSans.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <PublicEnvScript />
      </head>
      <body 
        suppressHydrationWarning 
        className="min-h-screen antialiased font-body"
        data-app-type="openframe"
      >
        <DeploymentInitializer />
        <DevTicketObserver />
        <RouteGuard>
          <div className="relative flex min-h-screen flex-col">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-ods-text-secondary">Loading...</div>
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </RouteGuard>
        <Toaster />
      </body>
    </html>
  )
}