import type { Metadata, Viewport } from 'next';
import { PublicEnvScript } from 'next-runtime-env';
import { Suspense } from 'react';
import './globals.css';
import '@flamingo-stack/openframe-frontend-core/styles';
import { DevTicketObserver } from '@/app/(auth)/auth/components/dev-ticket-observer';
import { azeretMono, dmSans } from '@/lib/fonts';
import { NatsAppProvider } from '@/lib/nats/nats-app-provider';
import { sidebarWidthFoucScript } from '@/lib/navigation-sidebar-state';
import { Toaster } from '@/lib/openframe-core-ui';
import { FeatureFlagsGate } from '../components/feature-flags-gate';
import { RouteGuard } from '../components/route-guard';
import { isAuthEnabled } from '../lib/app-mode';
import { QueryClientProvider } from '../lib/query-client-provider';
import { RelayProvider } from '../lib/relay';
import { AppShellSkeleton } from './components/app-shell-skeleton';
import { DeploymentInitializer } from './components/deployment-initializer';
import { EmbedShimRegistration } from './components/embed-shim-registration';
import { GoogleTagManager } from './components/google-tag-manager';
import { NativeShellInitializer } from './components/native-shell-initializer';
import { NotificationsDataProvider } from './components/notifications/notifications-data-provider';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://openframe.ai'),

  title: {
    default: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
    template: '%s | OpenFrame',
  },

  description:
    'Swap bloated vendor tools for open ones. Automate the boring crap. Take your margin back. AI-driven open-source OS for MSPs.',

  keywords: ['OpenFrame', 'MSP', 'managed service provider', 'open source', 'AI', 'automation', 'vendor tools', 'RMM'],

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://openframe.ai',
    siteName: 'OpenFrame',
    title: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
    description:
      'Swap bloated vendor tools for open ones. Automate the boring crap. Take your margin back. AI-driven open-source OS for MSPs.',
    images: [
      {
        url: '/assets/openframe/og-image.png',
        width: 1200,
        height: 630,
        alt: 'OpenFrame - AI-Driven Open-Source OS for MSPs',
      },
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
      { url: '/assets/openframe/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: [{ url: '/assets/openframe/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/assets/openframe/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/assets/openframe/favicon.svg',
      },
    ],
  },

  manifest: '/assets/openframe/site.webmanifest',

  other: {
    'theme-color': '#161616', // ODS background color (--ods-system-greys-background)
  },
};

// The viewport MUST be declared here, not as a manual <meta> in <head>: with no
// `viewport` export Next injects its own default tag after the manual one, and
// WebKit applies the last tag — which silently dropped maximum-scale and
// viewport-fit. Scale is pinned only in static-export (native WebView shell)
// builds to kill WebKit's focus-on-input auto-zoom; the web build keeps
// default scaling so browser pinch-zoom stays available.
export function generateViewport(): Viewport {
  const isStaticExport = process.env.OPENFRAME_BUILD_TARGET === 'export';
  return {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    ...(isStaticExport ? { maximumScale: 1, userScalable: false } : {}),
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Static-export (native-shell) builds have no server to populate
  // next-runtime-env, so the Capacitor/Tauri shell injects window.__ENV before
  // the bundle loads. The SSR/standalone web build keeps <PublicEnvScript />.
  const isStaticExport = process.env.OPENFRAME_BUILD_TARGET === 'export';
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${azeretMono.variable} ${dmSans.variable}`}>
      <head>
        {!isStaticExport && <PublicEnvScript />}
        {/* Seeds the sidebar width before first paint so the SSR'd skeleton
            honors the persisted collapsed state instead of flashing expanded. */}
        {/* biome-ignore lint/style/useNamingConvention: React's dangerouslySetInnerHTML requires the __html key */}
        <script dangerouslySetInnerHTML={{ __html: sidebarWidthFoucScript }} />
      </head>
      <body suppressHydrationWarning className="min-h-screen antialiased font-body" data-app-type="openframe">
        <GoogleTagManager />
        <EmbedShimRegistration />
        <DeploymentInitializer />
        <NativeShellInitializer />
        <RelayProvider>
          <QueryClientProvider>
            {isAuthEnabled() && (
              <Suspense fallback={null}>
                <DevTicketObserver />
              </Suspense>
            )}
            <NatsAppProvider>
              <FeatureFlagsGate>
                <NotificationsDataProvider>
                  <RouteGuard>
                    <div className="relative flex min-h-screen flex-col">
                      <Suspense fallback={<AppShellSkeleton />}>{children}</Suspense>
                    </div>
                  </RouteGuard>
                </NotificationsDataProvider>
              </FeatureFlagsGate>
            </NatsAppProvider>
          </QueryClientProvider>
        </RelayProvider>
        <Toaster />
      </body>
    </html>
  );
}
