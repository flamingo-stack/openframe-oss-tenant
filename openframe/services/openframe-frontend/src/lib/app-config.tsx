import React from 'react'
import { openframeConfig } from './platform-configs/openframe.config'

export type AppType = 'openframe-auth' | 'openframe-dashboard'

export interface NavigationMenuItem {
  id: string
  label: string
  href?: string
  icon?: React.ReactElement
  badge?: 'vendorCount' | 'selectionsCount' | number
  isExternal?: boolean
  onClick?: () => void
  children?: NavigationMenuItem[]
}

export interface NavigationSection {
  id: string
  title?: string
  items: NavigationMenuItem[]
  type?: 'single' | 'dropdown'
  showInHeader?: boolean
  showInMobile?: boolean
  icon?: React.ReactElement
  getIcon?: () => React.ReactElement
  dropdownContent?: React.ReactElement
  showDropdownDivider?: boolean
  className?: string
  dropdownClassName?: string
  mainHref?: string
}

export interface FooterLink {
  href: string
  label: string
}

export interface FooterSection {
  title: string
  links: FooterLink[]
}

export interface FooterCTA {
  title: string
  description: string
  buttonText: string
  buttonHref: string
}

export interface FooterConfig {
  showWaitlist?: boolean
  showCTA?: boolean
  ctaContent?: FooterCTA
  sections: FooterSection[]
  logo?: {
    getElement?: () => React.ReactElement
  }
  name?: {
    getElement?: () => React.ReactElement
  }
  customComponent?: {
    getElement?: () => React.ReactElement
  }
}

export interface AppConfig {
  name: string
  legalName: string
  description: string
  url: string
  logo: string
  slogan: string
  platform: 'openframe'
  brandColors: {
    primary: string
    accent: string
    background: string
    text: string
  }
  seo: {
    title: string
    titleTemplate: string
    description: string
    keywords: string[]
    ogImage: string
    twitterImage: string
  }
  layout: {
    showHeader: boolean
    showFooter: boolean
    showAnnouncement: boolean
    showSidebar: boolean
    headerType: 'platform' | 'admin'
    backgroundColor?: string
  }
  navigation: {
    logo: {
      href: string
      text: string
      icon: string
      getElement?: () => React.ReactElement
    }
    showPlatformNav: boolean
    showAdminNav: boolean
    showAdminMenuInHeader: boolean
    allowedRoutes: string[]
    restrictedRoutes: string[]
    headerMenu?: NavigationSection[]
    mobileMenu?: NavigationSection[]
    adminSidebar?: NavigationMenuItem[]
  }
  ui: {
    showUserMenu: boolean
    showMobileNav: boolean
    showSearchBar: boolean
    headerStyle: 'default' | 'minimal' | 'admin'
    headerAutoHide: boolean
    headerCTA?: {
      text: string
      href: string
      variant?: 'primary' | 'secondary' | 'outline'
      isExternal?: boolean
      getElement?: () => React.ReactElement
    }
    headerBackground?: string
    headerBorder?: string
    headerClassName?: string
    getHeaderActions: (params: {
      user: any
      router: any
      pathname?: string
      onSignUp?: () => void
      onToggleAdminSidebar?: () => void
    }) => {
      left: React.ReactElement[]
      right: React.ReactElement[]
    }
    mobileNav?: {
      menuIcon?: React.ReactElement
      closeIcon?: React.ReactElement
    }
    mobileNavClassName?: string
  }
  footer?: FooterConfig
  contact: {
    email: string
    supportUrl?: string
  }
  social: {
    github?: string
    twitter?: string
    linkedin?: string
    slack?: string
  }
  blog?: {
    cardVariant?: 'default' | 'flamingo'
  }
}

// For pure frontend, we only have one OpenFrame configuration
const APP_CONFIGS: Record<AppType, AppConfig> = {
  'openframe-auth': openframeConfig,
  'openframe-dashboard': openframeConfig
}

// Get current app type from environment
export function getCurrentAppType(): AppType {
  const appType = process.env.NEXT_PUBLIC_APP_TYPE as AppType
  return appType || 'openframe-dashboard' // default fallback
}

// Get app configuration for current or specified app
export function getAppConfig(appType?: AppType): AppConfig {
  const currentAppType = appType || getCurrentAppType()
  return APP_CONFIGS[currentAppType]
}

// Get all app configurations
export function getAllAppConfigs(): Record<AppType, AppConfig> {
  return APP_CONFIGS
}

// Helper to check if current app matches type
export function isCurrentApp(appType: AppType): boolean {
  return getCurrentAppType() === appType
}

// Get platform name for current app
export function getCurrentPlatform(): 'openframe' {
  return 'openframe'
}

// Get metadata base URL function for client-side
export function getMetadataBaseUrl(): string {
  // Production - use environment variables
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://openframe.dev'
  }
  
  // Development - use localhost
  return process.env.NEXT_PUBLIC_DEV_URL || 'http://localhost:4000'
}

// Get platform-specific asset paths
export function getPlatformAssetPaths(appType?: AppType) {
  const currentAppType = appType || getCurrentAppType()
  const baseUrl = getMetadataBaseUrl()
  
  return {
    favicon: `${baseUrl}/assets/openframe/favicon.ico`,
    appleIcon: `${baseUrl}/assets/openframe/apple-touch-icon.png`,
    manifest: `${baseUrl}/assets/openframe/site.webmanifest`,
    ogImage: `${baseUrl}/assets/openframe/og-image.png`,
    twitterImage: `${baseUrl}/assets/openframe/twitter-image.png`
  }
}

// Generate structured data for the app
export function generateStructuredData(config: AppConfig) {
  const baseUrl = getMetadataBaseUrl()
  
  const schemaLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.name,
    alternateName: ['Open Frame', 'OpenFrame Framework'],
    url: baseUrl,
    description: config.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    legalName: config.legalName,
    alternateName: ['Open Frame', 'OpenFrame Framework'],
    url: baseUrl,
    description: config.description,
    slogan: config.slogan,
    foundingDate: '2022-06-01',
    industry: 'Information Technology',
    logo: {
      '@type': 'ImageObject',
      url: `${baseUrl}${config.logo.startsWith('/') ? '' : '/'}${config.logo}`,
      width: 512,
      height: 512,
      caption: `${config.name} Logo`,
    },
    sameAs: Object.values(config.social).filter(Boolean),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        areaServed: 'US',
        availableLanguage: ['en'],
        email: config.contact.email,
        url: config.contact.supportUrl,
      }
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
  }

  return { schemaLd, organizationLd }
}

// Utility functions for app-aware UI decisions
export function shouldShowAdminMenu(userRole?: string): boolean {
  const config = getAppConfig()
  return config.navigation.showAdminMenuInHeader && userRole === 'super_admin'
}

export function shouldShowComponent(component: 'userMenu' | 'mobileNav' | 'searchBar' | 'platformNav' | 'adminNav'): boolean {
  const config = getAppConfig()
  switch (component) {
    case 'userMenu':
      return config.ui.showUserMenu
    case 'mobileNav':
      return config.ui.showMobileNav
    case 'searchBar':
      return config.ui.showSearchBar
    case 'platformNav':
      return config.navigation.showPlatformNav
    case 'adminNav':
      return config.navigation.showAdminNav
    default:
      return false
  }
}

export function isRouteAllowed(pathname: string): boolean {
  const config = getAppConfig()
  
  // Check if route is explicitly restricted
  if (config.navigation.restrictedRoutes.includes('*')) {
    return config.navigation.allowedRoutes.includes(pathname)
  }
  
  if (config.navigation.restrictedRoutes.some(route => pathname.startsWith(route))) {
    return false
  }
  
  // Check if route is in allowed routes (if specified)
  if (config.navigation.allowedRoutes.length > 0) {
    return config.navigation.allowedRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    )
  }
  
  return true
}

export function getHeaderStyle(): 'default' | 'minimal' | 'admin' {
  return getAppConfig().ui.headerStyle
}