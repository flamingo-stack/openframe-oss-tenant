/**
 * Centralized, typed registry of every internal app route.
 *
 * Single source of truth for navigation: instead of hand-writing path strings
 * (`router.push('/monitoring?tab=policies')`) scattered across the app, build
 * them here so paths, dynamic ids, and query params (tabs, filters) are all
 * type-checked.
 *
 * Static routes are plain strings; routes that take parameters are functions
 * whose options object is typed. Tab ids live in {@link TAB_IDS} and are the
 * source of truth shared with the in-page tab-component arrays.
 *
 *   router.push(routes.monitoring.root({ tab: 'policies' }));
 *   router.push(routes.customers.details(id, { tab: 'tickets' }));
 *   <Link href={routes.devices.details(deviceId)} />
 *
 * This module owns how URLs are *produced* — in-page tab state (useApiParams /
 * TabNavigation) is unchanged. URL/path values themselves are not changing, so
 * existing bookmarks stay valid.
 */

// --------------------------------------------------------------------------
// Tab ids (single source of truth, shared with the tab-component arrays)
// --------------------------------------------------------------------------

export const TAB_IDS = {
  customersList: ['active', 'archived'],
  customerDetails: ['devices', 'tickets', 'logs', 'details', 'custom-ai-assistant'],
  deviceDetails: [
    'hardware',
    'network',
    'security',
    'compliance',
    'agents',
    'users',
    'software',
    'vulnerabilities',
    'logs',
  ],
  scripts: ['list', 'schedules'],
  scriptsV2Details: ['details', 'history', 'execution-logs'],
  monitoring: ['policies', 'queries'],
  settings: ['ai-settings', 'architecture', 'company-and-users', 'api-keys', 'sso-configuration', 'profile'],
  notifications: ['history'],
} as const;

export type CustomerListTab = (typeof TAB_IDS.customersList)[number];
export type CustomerDetailTab = (typeof TAB_IDS.customerDetails)[number];
export type DeviceDetailTab = (typeof TAB_IDS.deviceDetails)[number];
export type ScriptsTab = (typeof TAB_IDS.scripts)[number];
export type ScriptsV2DetailTab = (typeof TAB_IDS.scriptsV2Details)[number];
export type MonitoringTab = (typeof TAB_IDS.monitoring)[number];
export type SettingsTab = (typeof TAB_IDS.settings)[number];
export type NotificationsTab = (typeof TAB_IDS.notifications)[number];

// --------------------------------------------------------------------------
// Query-string helper
// --------------------------------------------------------------------------

type QueryValue = string | number | boolean | undefined | null;

/**
 * Append a typed query object to a base path. Skips `undefined`/`null` values
 * and URL-encodes the rest, so every parametrized route shares identical query
 * semantics.
 */
function withQuery(base: string, query?: Record<string, QueryValue>): string {
  if (!query) return base;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) qs.set(key, String(value));
  }
  const serialized = qs.toString();
  return serialized ? `${base}?${serialized}` : base;
}

// --------------------------------------------------------------------------
// The route registry
// --------------------------------------------------------------------------

export const routes = {
  root: '/',
  dashboard: '/dashboard',
  onboarding: '/onboarding',
  helpCenter: '/help-center',

  auth: {
    root: '/auth',
    login: '/auth/login',
    signup: '/auth/signup',
    verify: '/auth/verify',
    invite: '/auth/invite',
    passwordReset: '/auth/password-reset',
    error: '/auth/error',
  },

  customers: {
    list: (o?: { tab?: CustomerListTab }) => withQuery('/customers', { tab: o?.tab }),
    details: (id: string | number, o?: { tab?: CustomerDetailTab }) =>
      withQuery(`/customers/details/${id}`, { tab: o?.tab }),
    editNew: '/customers/edit/new',
    edit: (id: string | number) => `/customers/edit/${id}`,
  },

  devices: {
    list: '/devices',
    new: (o?: { organizationId?: string }) => withQuery('/devices/new', { organizationId: o?.organizationId }),
    details: (id: string | number, o?: { tab?: DeviceDetailTab; action?: 'runScript' }) =>
      withQuery(`/devices/details/${id}`, { tab: o?.tab, action: o?.action }),
    remoteShell: (id: string | number) => `/devices/details/${id}/remote-shell`,
    remoteDesktop: (id: string | number) => `/devices/details/${id}/remote-desktop`,
    fileManager: (id: string | number) => `/devices/details/${id}/file-manager`,
  },

  scripts: {
    list: (o?: { tab?: ScriptsTab }) => withQuery('/scripts', { tab: o?.tab }),
    create: '/scripts/create',
    details: (id: string | number) => `/scripts/details/${id}`,
    run: (id: string | number) => `/scripts/details/${id}/run`,
    edit: (id: string | number) => `/scripts/edit/${id}`,
    schedules: {
      create: '/scripts/schedules/create',
      details: (id: string | number) => `/scripts/schedules/${id}`,
      edit: (id: string | number) => `/scripts/schedules/${id}/edit`,
      devices: (id: string | number) => `/scripts/schedules/${id}/devices`,
    },
  },

  scriptsV2: {
    list: '/scripts-v2',
    create: '/scripts-v2/create',
    archived: '/scripts-v2/archived',
    details: (id: string | number, o?: { tab?: ScriptsV2DetailTab }) =>
      withQuery(`/scripts-v2/details/${id}`, { tab: o?.tab }),
    run: (id: string | number) => `/scripts-v2/details/${id}/run`,
    edit: (id: string | number) => `/scripts-v2/edit/${id}`,
    execution: (id: string | number) => `/scripts-v2/executions/${id}`,
  },

  monitoring: {
    root: (o?: { tab?: MonitoringTab }) => withQuery('/monitoring', { tab: o?.tab }),
    query: (id: string | number) => `/monitoring/query/${id}`,
    queryEditNew: '/monitoring/query/edit/new',
    queryEdit: (id: string | number) => `/monitoring/query/edit/${id}`,
    policy: (id: string | number) => `/monitoring/policy/${id}`,
    policyEditNew: '/monitoring/policy/edit/new',
    policyEdit: (id: string | number) => `/monitoring/policy/edit/${id}`,
  },

  tickets: {
    list: '/tickets',
    new: (o?: { edit?: string }) => withQuery('/tickets/new', { edit: o?.edit }),
    dialog: (id: string | number) => withQuery('/tickets/dialog', { id }),
    archive: '/tickets/archive',
    statuses: '/tickets/statuses',
  },

  logs: {
    page: '/logs-page',
    details: '/log-details',
  },

  knowledgeBase: {
    list: '/knowledge-base',
    new: '/knowledge-base/new',
    archive: '/knowledge-base/archive',
    details: (id: string | number) => `/knowledge-base/details/${id}`,
    edit: (id: string | number) => `/knowledge-base/edit/${id}`,
    folder: (id: string | number) => `/knowledge-base/folders/${id}`,
  },

  settings: {
    root: (o?: { tab?: SettingsTab }) => withQuery('/settings', { tab: o?.tab }),
    employees: '/settings/employees',
    employeeDetails: (id: string | number) => `/settings/employees/details/${id}`,
    aiSettings: '/settings/ai-settings',
    apiKeys: '/settings/api-keys',
    sso: '/settings/sso',
    architecture: '/settings/architecture',
    billingUsage: '/settings/billing-usage',
    billingSubscription: '/settings/billing-usage/subscription',
  },

  mingo: (o?: { dialogId?: string }) => withQuery('/mingo', { dialogId: o?.dialogId }),

  notifications: (o?: { tab?: NotificationsTab }) => withQuery('/notifications', { tab: o?.tab }),

  checkout: {
    success: '/checkout/success',
    cancel: '/checkout/cancel',
  },
} as const;
