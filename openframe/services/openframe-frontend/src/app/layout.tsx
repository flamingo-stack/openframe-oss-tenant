import type { Metadata } from 'next'
import { PublicEnvScript } from 'next-runtime-env'
import { Suspense } from 'react'
import './globals.css'
import '@flamingo/ui-kit/styles'
import { azeretMono, dmSans } from '@flamingo/ui-kit/fonts'
import { Toaster } from '@flamingo/ui-kit/components/ui'
import { DevTicketObserver } from './auth/components/dev-ticket-observer'
import { DeploymentInitializer } from './components/deployment-initializer'
import { GoogleTagManager } from './components/google-tag-manager'
import { ImageConfigInitializer } from '../components/image-config-initializer'
import { GraphQLIntrospectionInitializer } from '../components/graphql-introspection-initializer'
import { RouteGuard } from '../components/route-guard'
import { isAuthEnabled } from '../lib/app-mode'
import { AppShellSkeleton } from './components/app-shell-skeleton'

// Force dynamic rendering for all routes to prevent SSG issues with useSearchParams
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://openframe.ai'),

  title: {
    default: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
    template: '%s | OpenFrame'
  },

  description: 'Swap bloated vendor tools for open ones. Automate the boring crap. Take your margin back. AI-driven open-source OS for MSPs.',

  keywords: ['OpenFrame', 'MSP', 'managed service provider', 'open source', 'AI', 'automation', 'vendor tools', 'RMM'],

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://openframe.ai',
    siteName: 'OpenFrame',
    title: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
    description: 'Swap bloated vendor tools for open ones. Automate the boring crap. Take your margin back. AI-driven open-source OS for MSPs.',
    images: [
      {
        url: '/assets/openframe/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
      }
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
    description: 'Swap bloated vendor tools for open ones. Automate the boring crap. Take your margin back.',
    images: ['/assets/openframe/twitter-image.png'],
  },

  icons: {
    icon: [
      { url: '/assets/openframe/favicon.svg', type: 'image/svg+xml' },
      { url: '/assets/openframe/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/assets/openframe/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/assets/openframe/favicon-32x32.png', sizes: '32x32', type: 'image/png' }
    ],
    shortcut: [
      { url: '/assets/openframe/favicon.ico', type: 'image/x-icon' }
    ],
    apple: [
      { url: '/assets/openframe/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/assets/openframe/favicon.svg',
      }
    ]
  },

  manifest: '/assets/openframe/site.webmanifest',

  other: {
    'theme-color': '#161616', // ODS background color (--ods-system-greys-background)
  }
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
        <GoogleTagManager />
        <DeploymentInitializer />
        <ImageConfigInitializer />
        {isAuthEnabled() && (
          <Suspense fallback={null}>
            <DevTicketObserver />
            <GraphQLIntrospectionInitializer />
          </Suspense>
        )}
        <RouteGuard>
          <div className="relative flex min-h-screen flex-col">
            <Suspense fallback={<AppShellSkeleton />}>
              {children}
            </Suspense>
          </div>
        </RouteGuard>
        <Toaster />
      </body>
    </html>
  )
}