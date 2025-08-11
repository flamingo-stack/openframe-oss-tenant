<template>
  <div class="login-page">
    <div class="login-container">
      <!-- Step 1: Email input for tenant discovery -->
      <div v-if="step === 'email'" class="login-step">
        <div class="login-header">
          <h1 class="login-title">Login</h1>
          <p class="login-subtitle">Returning user - enters email and tenant discovery service returns possible auth providers</p>
        </div>
        
        <form @submit.prevent="handleEmailSubmit" class="login-form">
          <div class="form-group">
            <input 
              v-model="email" 
              type="email" 
              placeholder="user@company.com"
              class="form-input"
              required 
              :disabled="loading"
            />
            <button type="submit" class="form-button" :disabled="loading || !isValidEmail">
              {{ loading ? '...' : '✓' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Step 2: Tenant selection and authentication -->
      <div v-else-if="step === 'auth'" class="login-step">
        <div class="login-header">
          <h1 class="login-title">Login</h1>
          <p class="login-subtitle">
            <span class="user-email">{{ email }}</span>
            <button @click="resetFlow" class="edit-email-btn">✓</button>
          </p>
        </div>

        <div class="auth-options">
          <!-- Login with OpenFrame button (if multiple tenants) -->
          <button 
            v-if="hasOpenFrameSSO" 
            @click="handleOpenFrameLogin"
            class="auth-button primary"
            :disabled="loading"
          >
            Login with OpenFrame
          </button>

          <!-- Password login option -->
          <div v-if="hasPasswordAuth" class="password-section">
            <button 
              v-if="!showPasswordForm"
              @click="showPasswordForm = true"
              class="auth-button secondary"
            >
              Password
            </button>

            <form v-else @submit.prevent="handlePasswordLogin" class="password-form">
              <div class="form-group">
                <input 
                  v-model="password" 
                  type="password" 
                  placeholder="Enter your password"
                  class="form-input"
                  required 
                  :disabled="loading"
                  ref="passwordInput"
                />
                <button type="submit" class="form-button" :disabled="loading || !password">
                  {{ loading ? '...' : '→' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Google SSO option -->
          <button 
            v-if="hasGoogleSSO" 
            @click="handleGoogleLogin"
            class="auth-button google"
            :disabled="loading"
          >
            Sign in with Google
          </button>

          <!-- Microsoft SSO option (commented out as requested) -->
          <!-- 
          <button 
            v-if="hasMicrosoftSSO" 
            @click="handleMicrosoftLogin"
            class="auth-button microsoft"
            :disabled="loading"
          >
            Sign in with Microsoft
          </button>
          -->
        </div>

        <!-- Tenant list (if multiple tenants) -->
        <div v-if="tenants.length > 1" class="tenant-list">
          <h3>Select Organization</h3>
          <div class="tenant-item" v-for="tenant in tenants" :key="tenant.tenant_id">
            <div class="tenant-info">
              <span class="tenant-name">{{ tenant.tenant_name }}</span>
              <span class="tenant-url">{{ tenant.openframe_url }}</span>
            </div>
            <div class="tenant-auth-options">
              <button 
                v-for="provider in tenant.auth_providers" 
                :key="provider"
                @click="handleTenantAuth(tenant, provider)"
                class="tenant-auth-btn"
                :class="provider"
                :disabled="loading"
              >
                {{ getProviderLabel(provider) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Registration link -->
        <div class="signup-link">
          <p>Don't have an account? <router-link to="/auth/register">Create one</router-link></p>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
      </div>

      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { AuthService } from '../../services/AuthService'
import { ToastService } from '../../services/ToastService'
import type { TenantInfo } from '../../types/auth'

const router = useRouter()
const authStore = useAuthStore()
const toastService = ToastService.getInstance()

// Reactive state
const step = ref<'email' | 'auth'>('email')
const email = ref('')
const password = ref('')
const tenants = ref<TenantInfo[]>([])
const loading = ref(false)
const error = ref('')
const showPasswordForm = ref(false)
const passwordInput = ref<HTMLInputElement>()

// Computed
const isValidEmail = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.value)
})

const hasOpenFrameSSO = computed(() => {
  return tenants.value.some(t => t.auth_providers.includes('openframe_sso'))
})

const hasPasswordAuth = computed(() => {
  return tenants.value.some(t => t.auth_providers.includes('password'))
})

const hasGoogleSSO = computed(() => {
  return tenants.value.some(t => t.auth_providers.includes('google'))
})

const hasMicrosoftSSO = computed(() => {
  return tenants.value.some(t => t.auth_providers.includes('microsoft'))
})

// Methods
async function handleEmailSubmit() {
  if (!isValidEmail.value) return

  loading.value = true
  error.value = ''

  try {
    const response = await AuthService.discoverTenants(email.value)
    
    if (response.has_existing_accounts) {
      tenants.value = response.tenants
      step.value = 'auth'
      
      // Auto-focus password field if only password auth is available
      if (hasPasswordAuth.value && !hasOpenFrameSSO.value && !hasGoogleSSO.value) {
        showPasswordForm.value = true
        await nextTick()
        passwordInput.value?.focus()
      }
    } else {
      // No existing accounts, redirect to registration
      toastService.showInfo('No existing accounts found. Redirecting to registration...')
      setTimeout(() => {
        router.push({ name: 'Register', query: { email: email.value } })
      }, 1500)
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to check email. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handlePasswordLogin() {
  if (!password.value) return

  loading.value = true
  error.value = ''

  try {
    await authStore.login(email.value, password.value)
    toastService.showSuccess('Welcome back!')
    
    // Redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 1000)
  } catch (err: any) {
    error.value = err.message || 'Login failed. Please check your password.'
  } finally {
    loading.value = false
  }
}

async function handleOpenFrameLogin() {
  if (tenants.value.length === 0) return

  loading.value = true
  error.value = ''

  try {
    // Use the first tenant with OpenFrame SSO
    const targetTenant = tenants.value.find(t => t.auth_providers.includes('openframe_sso'))
    if (targetTenant) {
      await AuthService.openFrameSSO(targetTenant.tenant_name)
      toastService.showSuccess('OpenFrame SSO successful!')
      
      // Redirect to the tenant's OpenFrame URL
      window.location.href = targetTenant.openframe_url
    }
  } catch (err: any) {
    error.value = err.message || 'OpenFrame SSO failed. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleGoogleLogin() {
  // Implement Google OAuth flow
  toastService.showInfo('Google SSO not yet implemented')
}

async function handleTenantAuth(tenant: TenantInfo, provider: string) {
  loading.value = true
  error.value = ''

  try {
    switch (provider) {
      case 'password':
        // Show password form for this specific tenant
        showPasswordForm.value = true
        await nextTick()
        passwordInput.value?.focus()
        break
      case 'google':
        await handleGoogleLogin()
        break
      case 'openframe_sso':
        await AuthService.openFrameSSO(tenant.tenant_name)
        window.location.href = tenant.openframe_url
        break
    }
  } catch (err: any) {
    error.value = err.message || 'Authentication failed. Please try again.'
  } finally {
    loading.value = false
  }
}

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'password': return 'Password'
    case 'google': return 'Google'
    case 'microsoft': return 'Microsoft'
    case 'openframe_sso': return 'OpenFrame SSO'
    default: return provider
  }
}

function resetFlow() {
  step.value = 'email'
  email.value = ''
  password.value = ''
  tenants.value = []
  error.value = ''
  showPasswordForm.value = false
}
</script>

<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--surface-ground);
}

.login-container {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 420px;
  box-shadow: var(--card-shadow);
  position: relative;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.login-subtitle {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}

.user-email {
  color: var(--primary-color);
  font-weight: 500;
}

.edit-email-btn {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.9rem;
  margin-left: 0.5rem;
  padding: 0.25rem;
  border-radius: 4px;
}

.edit-email-btn:hover {
  background: var(--primary-color-light);
}

.form-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.form-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--surface-ground);
  color: var(--text-color);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-button {
  padding: 0.75rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  min-width: 50px;
  transition: background-color 0.2s ease;
}

.form-button:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.form-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.auth-button {
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.auth-button.primary {
  background: var(--primary-color);
  color: white;
}

.auth-button.primary:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.auth-button.secondary {
  background: transparent;
  color: var(--text-color);
  border: 1px solid var(--surface-border);
}

.auth-button.secondary:hover:not(:disabled) {
  background: var(--surface-hover);
}

.auth-button.google {
  background: #4285f4;
  color: white;
}

.auth-button.google:hover:not(:disabled) {
  background: #3367d6;
}

.auth-button.microsoft {
  background: #00a4ef;
  color: white;
}

.auth-button.microsoft:hover:not(:disabled) {
  background: #106ebe;
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.password-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.password-form {
  margin: 0;
}

.tenant-list {
  margin: 2rem 0;
  padding-top: 2rem;
  border-top: 1px solid var(--surface-border);
}

.tenant-list h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 1rem 0;
}

.tenant-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.tenant-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tenant-name {
  font-weight: 500;
  color: var(--text-color);
}

.tenant-url {
  font-size: 0.85rem;
  color: var(--text-color-secondary);
}

.tenant-auth-options {
  display: flex;
  gap: 0.5rem;
}

.tenant-auth-btn {
  padding: 0.5rem 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tenant-auth-btn.password {
  background: var(--surface-border);
  color: var(--text-color);
}

.tenant-auth-btn.google {
  background: #4285f4;
  color: white;
}

.tenant-auth-btn.openframe_sso {
  background: var(--primary-color);
  color: white;
}

.tenant-auth-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.tenant-auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.signup-link {
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--surface-border);
}

.signup-link p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.signup-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.signup-link a:hover {
  text-decoration: underline;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--surface-border);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: var(--red-50);
  color: var(--red-700);
  padding: 0.875rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.9rem;
  text-align: center;
  border: 1px solid var(--red-200);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .loading-overlay {
    background: rgba(0, 0, 0, 0.9);
  }
}

/* Mobile responsiveness */
@media (max-width: 480px) {
  .login-container {
    padding: 1.5rem;
    max-width: 100%;
  }
  
  .tenant-item {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .tenant-auth-options {
    justify-content: center;
  }
}
</style>