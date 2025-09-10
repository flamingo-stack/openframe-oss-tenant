<template>
  <div class="central-auth-container">
    <!-- Header -->
    <div class="auth-header">
      <h1 class="brand-logo">
        <span class="brand-title">Open<span class="brand-highlight">Frame</span></span>
      </h1>
      <p class="auth-subtitle">Multi-tenant authentication platform</p>
    </div>

    <!-- Main Content -->
    <div class="auth-content">
      <!-- Left Side - Registration -->
      <div class="auth-section">
        <div class="section-header">
          <h2>Create Organization</h2>
          <p>Start your journey with OpenFrame</p>
        </div>

        <!-- Organization Details (always visible) -->
        <div class="organization-details">
          <div class="form-group">
            <label class="form-label">Organization Name</label>
            <input
              v-model="registerForm.tenantName"
              type="text"
              placeholder="Your company name"
              class="form-input"
              required
              :disabled="registerLoading"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Domain</label>
            <input
              v-model="registerForm.tenantDomain"
              type="text"
              placeholder="localhost"
              class="form-input"
              required
              :disabled="true"
            />
            <small class="form-hint">Default domain for local development</small>
          </div>
        </div>

        <!-- SSO Registration Options removed -->

        <!-- Manual Registration Form (alternative to SSO) -->
        <div class="manual-registration">
          <div class="divider">
            <span>or register manually</span>
          </div>

          <form @submit.prevent="handleManualRegistration" class="auth-form">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input
                  v-model="registerForm.firstName"
                  type="text"
                  placeholder="John"
                  class="form-input"
                  required
                  :disabled="registerLoading"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input
                  v-model="registerForm.lastName"
                  type="text"
                  placeholder="Doe"
                  class="form-input"
                  required
                  :disabled="registerLoading"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                v-model="registerForm.email"
                type="email"
                placeholder="user@company.com"
                class="form-input"
                required
                :disabled="registerLoading"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <input
                v-model="registerForm.password"
                type="password"
                placeholder="Choose a strong password"
                class="form-input"
                required
                :disabled="registerLoading"
              />
              <small v-if="passwordValidationMessage" class="form-hint" style="color: var(--red-500);">
                {{ passwordValidationMessage }}
              </small>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password</label>
              <input
                v-model="registerForm.confirmPassword"
                type="password"
                placeholder="Confirm your password"
                class="form-input"
                required
                :disabled="registerLoading"
              />
            </div>

            <button type="submit" class="btn-primary" :disabled="registerLoading || !isPasswordMatch || !registerForm.tenantName || !!passwordValidationMessage">
              <i v-if="registerLoading" class="pi pi-spin pi-spinner"></i>
              <span v-else>Create Organization</span>
            </button>
          </form>
        </div>
      </div>

      <!-- Right Side - Login -->
      <div class="auth-section">
        <div class="section-header">
          <h2>Sign In</h2>
          <p>Access your organization</p>
        </div>

        <!-- Email Input Step -->
        <div v-if="!showProviders" class="auth-form">
          <form @submit.prevent="handleEmailSubmit">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                v-model="email"
                type="email"
                placeholder="user@company.com"
                class="form-input"
                required
                :disabled="loading"
              />
            </div>
            
            <button type="submit" class="btn-primary" :disabled="loading || !email">
              <i v-if="loading" class="pi pi-spin pi-spinner"></i>
              <span v-else>Continue</span>
            </button>
          </form>
        </div>

        <!-- Auth Providers Step -->
        <div v-else class="auth-form">
          <div class="back-section">
            <button @click="goBack" class="btn-back">
              <i class="pi pi-arrow-left"></i>
              <span>{{ email }}</span>
            </button>
          </div>

          <!-- Selected organization hint (when only one tenant found) -->
          <div v-if="discoveredTenants.length === 1 && ((discoveredTenants[0].tenantName ?? (discoveredTenants[0] as any).tenant_name))" class="org-summary">
            <i class="pi pi-building mr-2"></i>
            <span class="org-label">Organization:</span>
            <span class="org-name">{{ (discoveredTenants[0].tenantName ?? (discoveredTenants[0] as any).tenant_name) }}</span>
          </div>

          <div v-if="discoveredTenants.length > 0">
            <div v-for="tenant in discoveredTenants" :key="(tenant.tenantId ?? (tenant as any).tenant_id) || 'single'" class="tenant-section">
              <div class="tenant-info" v-if="tenant.tenantName || (tenant as any).tenant_name">
                <h3>{{ tenant.tenantName }}</h3>
                <p class="tenant-domain">{{ tenant.tenantDomain }}</p>
              </div>


              <!-- Alternative methods -->
              <div v-if="(tenant.authProviders ?? tenant.auth_providers ?? []).includes('openframe-sso') || (tenant.authProviders ?? tenant.auth_providers ?? []).includes('google')" class="alternative-methods">
                <div v-if="(tenant.authProviders ?? tenant.auth_providers ?? []).includes('openframe-sso')" class="sso-option">
                  <button @click="handleOpenFrameSSO(tenant)" class="btn-alt" :disabled="loading">
                    <i class="pi pi-shield"></i>
                    <span>Use OpenFrame SSO</span>
                  </button>
                </div>
                
                <div v-if="(tenant.authProviders ?? tenant.auth_providers ?? []).includes('google')" class="sso-option">
                  <button @click="handleGoogleSSO(tenant)" class="btn-alt google" :disabled="loading">
                    <i class="pi pi-google"></i>
                    <span>Sign in with Google</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="no-orgs">
            <h3>No organizations found</h3>
            <p>We couldn't find any organizations for this email address.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { authService } from '@/services/AuthService'
import { useAuthStore } from '@/stores/auth'
import type { TenantDiscoveryResponse } from '@/types/auth'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const authStore = useAuthStore()

// Check for OAuth errors in URL parameters
onMounted(() => {
  const error = route.query.error
  const message = route.query.message
  
  if (error === 'oauth_failed' && message) {
    toast.add({
      severity: 'error',
      summary: 'Authentication Failed',
      detail: String(message),
      life: 8000
    })
    
    // Clean the URL
    router.replace({ path: '/central-auth-demo' })
  }
})

// Login form data
const email = ref('')
  // Password login removed
const loading = ref(false)
const showProviders = ref(false)
const discoveredTenants = ref<TenantDiscoveryResponse.TenantInfo[]>([])

// Registration form data
const registerLoading = ref(false)
const registerForm = reactive({
  tenantName: '',
  tenantDomain: 'localhost',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// ===== PKCE helpers =====
function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array.buffer)
}

function isPasswordStrong(pw: string): boolean {
  if (!pw) return false
  return pw.length >= 5
}

const passwordValidationMessage = computed(() => {
  if (!registerForm.password) return ''
  return isPasswordStrong(registerForm.password)
    ? ''
    : 'Password must be at least 5 characters'
})

// Email submission handler for login
async function handleEmailSubmit() {
  if (!email.value) return
  
  loading.value = true
  try {
    console.log('🔍 [CentralAuth] Discovering tenants for email:', email.value)
    
    const response = await authService.discoverTenants(email.value)
    // New schema: single-tenant summary when user exists
    if ((response as any).has_existing_accounts) {
      discoveredTenants.value = [
        {
          tenantId: (response as any).tenant_id,
          authProviders: (response as any).auth_providers
        } as any
      ]
    } else {
      discoveredTenants.value = []
    }
    showProviders.value = true
    
    console.log('✅ [CentralAuth] Discovery:', response)
  } catch (error: any) {
    console.error('❌ [CentralAuth] Tenant discovery failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Discovery Failed',
      detail: error.message || 'Failed to discover tenants',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

// Go back to email input
function goBack() {
  showProviders.value = false
  discoveredTenants.value = []
  // no-op: password login removed
}

// Password login removed

// Handle OpenFrame SSO
async function handleOpenFrameSSO(tenant: TenantDiscoveryResponse.TenantInfo) {
  loading.value = true
  try {
    console.log('🔗 [CentralAuth] Attempting OpenFrame SSO for tenant:', (tenant.tenantName ?? (tenant as any).tenant_name))
    
    const tenantId = (tenant.tenantId ?? (tenant as any).tenant_id) as string
    const domain = (tenant.tenantDomain ?? (tenant as any).tenant_domain ?? 'localhost') as string
    
    // Store tenant info in session storage
    sessionStorage.setItem('auth:tenant_id', tenantId)
    sessionStorage.setItem('auth:tenant_domain', domain)
    
    // Use Gateway's login endpoint
    const loginUrl = `${import.meta.env.VITE_GATEWAY_URL}/oauth/login?tenantId=${encodeURIComponent(tenantId)}`;
    window.location.href = loginUrl;
    
  } catch (error: any) {
    console.error('❌ [CentralAuth] SSO failed:', error)
    toast.add({
      severity: 'error',
      summary: 'SSO Failed',
      detail: error.message || 'OpenFrame SSO authentication failed',
      life: 5000
    })
    loading.value = false
  }
}

// Computed property for password match
const isPasswordMatch = computed(() => {
  return registerForm.password && registerForm.confirmPassword && 
         registerForm.password === registerForm.confirmPassword
})

// Removed OpenFrame SSO registration button/flow per request

// Handle Google SSO for login - using Gateway OAuth2 flow
async function handleGoogleSSO(tenant: TenantDiscoveryResponse.TenantInfo) {
  loading.value = true
  try {
    console.log('🔗 [CentralAuth] Attempting Google SSO for tenant:', tenant.tenantName)
    
    // Use Gateway's login endpoint for Google SSO
    const tid: string = (tenant.tenantId ?? (tenant as any).tenant_id) as string
    const loginUrl = `${import.meta.env.VITE_GATEWAY_URL}/oauth/login?tenantId=${encodeURIComponent(tid)}&provider=google`;
    window.location.href = loginUrl;
    
  } catch (error: any) {
    console.error('❌ [CentralAuth] Google SSO failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Google SSO Failed',
      detail: error.message || 'Google SSO authentication failed',
      life: 5000
    })
    loading.value = false
  }
}

// Google SSO registration removed per request

// Handle manual registration
async function handleManualRegistration() {
  if (!isPasswordMatch.value) {
    toast.add({
      severity: 'error',
      summary: 'Password Mismatch',
      detail: 'Passwords do not match',
      life: 5000
    })
    return
  }

  if (!isPasswordStrong(registerForm.password)) {
    toast.add({
      severity: 'error',
      summary: 'Weak Password',
      detail: 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character',
      life: 6000
    })
    return
  }

  if (!registerForm.tenantName) {
    toast.add({
      severity: 'error',
      summary: 'Organization Required',
      detail: 'Please enter an organization name',
      life: 5000
    })
    return
  }

  registerLoading.value = true
  try {
    console.log('📝 [CentralAuth] Attempting manual registration for tenant:', registerForm.tenantName)

    // Store tenant info in session storage
    sessionStorage.setItem('auth:tenant_domain', registerForm.tenantDomain || 'localhost')

    // Minimal registration via Authorization Server (no PKCE, no redirect)
    await (await import('@/services/AuthService')).AuthService.registerOrganization({
      email: registerForm.email,
      firstName: registerForm.firstName,
      lastName: registerForm.lastName,
      password: registerForm.password,
      tenantName: registerForm.tenantName,
      tenantDomain: registerForm.tenantDomain
    })

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Organization successfully registered. You can now sign in.',
      life: 4000
    })
  } catch (error: any) {
    console.error('❌ [CentralAuth] Registration failed:', error)
    toast.add({
      severity: 'error',
      summary: 'Registration Failed',
      detail: error?.message || 'Failed to create organization',
      life: 5000
    })
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
.central-auth-container {
  min-height: 100vh;
  background: var(--surface-ground);
  display: flex;
  flex-direction: column;
}

.auth-header {
  text-align: center;
  padding: 2rem 0;
  background: var(--surface-card);
  border-bottom: 1px solid var(--surface-border);
}

.brand-logo {
  font-size: 2.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: var(--text-color);
}

.brand-title {
  color: var(--text-color);
}

.brand-highlight {
  color: var(--primary-color);
}

.auth-subtitle {
  color: var(--text-color-secondary);
  font-size: 1rem;
  margin: 0;
}

/* Organization summary (sign-in step) */
.org-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 0 16px;
  color: var(--text-color);
}
.org-label {
  font-weight: 600;
  color: var(--text-color-secondary);
}
.org-name {
  font-weight: 600;
}

.auth-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 3rem 2rem;
}

.auth-section {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.section-header {
  text-align: center;
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.section-header p {
  color: var(--text-color-secondary);
  margin: 0;
}

.auth-form {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--surface-card);
  color: var(--text-color);
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.2);
}

.btn-primary {
  width: 100%;
  background: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.btn-secondary {
  background: var(--surface-border);
  color: var(--text-color);
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-secondary:hover {
  background: var(--surface-300);
}

.btn-sso {
  width: 100%;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  margin-bottom: 1rem;
}

.btn-sso.openframe {
  background: var(--primary-color);
  color: white;
}

.btn-sso.openframe:hover:not(:disabled) {
  background: var(--primary-color-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.3);
}

.btn-sso.google {
  background: #4285f4;
  color: white;
}

.btn-sso.google:hover:not(:disabled) {
  background: #3367d6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
}

.btn-sso:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.sso-options {
  margin-bottom: 1rem;
}

.sso-option {
  margin-bottom: 1rem;
}

.registration-form {
  margin-top: 1rem;
}

.form-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.form-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.form-header p {
  color: var(--text-color-secondary);
  margin: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.form-actions .btn-primary,
.form-actions .btn-secondary {
  flex: 1;
}

.form-hint {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
  display: block;
}

.organization-details {
  margin-bottom: 1.5rem;
}

.manual-registration {
  margin-top: 1.5rem;
}

.divider {
  text-align: center;
  margin: 1.5rem 0;
  position: relative;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--surface-border);
}

.divider span {
  background: var(--surface-card);
  padding: 0 1rem;
  color: var(--text-color-secondary);
  font-size: 0.875rem;
  position: relative;
  z-index: 1;
}

.back-section {
  margin-bottom: 1.5rem;
}

.btn-back {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  padding: 4px 0;
  transition: color 0.2s ease;
}

.btn-back:hover {
  color: var(--primary-color);
}

.tenant-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  background: var(--surface-ground);
}

.tenant-info h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.25rem 0;
}

.tenant-domain {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin: 0 0 1rem 0;
}

.auth-method {
  margin-bottom: 1rem;
}

.alternative-methods {
  margin-top: 1rem;
}

.btn-alt {
  background: none;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  width: 100%;
  justify-content: center;
}

.btn-alt:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
}

.btn-alt:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.no-orgs {
  text-align: center;
  padding: 2rem 0;
}

.no-orgs h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.no-orgs p {
  color: var(--text-color-secondary);
  margin: 0;
}

/* Dark mode adjustments */
[data-theme="dark"] .auth-header {
  background: var(--surface-card);
}

[data-theme="dark"] .auth-section {
  background: var(--surface-card);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .tenant-section {
  background: var(--surface-section);
  border-color: var(--surface-border);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .auth-content {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding: 2rem 1rem;
  }
  
  .auth-header {
    padding: 1.5rem 0;
  }
  
  .brand-logo {
    font-size: 2rem;
  }
  
  .auth-section {
    padding: 1.5rem;
  }
  
  .section-header h2 {
    font-size: 1.5rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .auth-content {
    padding: 1rem;
  }
  
  .auth-section {
    padding: 1rem;
  }
  
  .brand-logo {
    font-size: 1.75rem;
  }
  
  .section-header h2 {
    font-size: 1.25rem;
  }
}
</style>