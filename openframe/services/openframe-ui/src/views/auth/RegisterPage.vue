<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-header">
        <h1 class="register-title">Sign Up</h1>
        <p class="register-subtitle">Step 1 Choose team</p>
      </div>

      <form @submit.prevent="handleSubmit" class="register-form">
        <!-- Step 1: Organization name -->
        <div class="form-section">
          <div class="form-group">
            <input 
              v-model="organizationName" 
              type="text" 
              placeholder="Enter organization name"
              class="form-input"
              :class="{ 'is-invalid': organizationError }"
              required 
              :disabled="loading || isLocalhostFixed"
              @input="checkOrganizationAvailability"
            />
            <div v-if="organizationLoading" class="availability-status loading">
              <div class="spinner"></div>
            </div>
            <div v-else-if="organizationAvailable && organizationName" class="availability-status available">
              ✓
            </div>
            <div v-else-if="organizationError" class="availability-status unavailable">
              ✗
            </div>
          </div>
          
          <div v-if="organizationError" class="error-text">
            {{ organizationError }}
          </div>
          
          <div v-if="suggestedUrl" class="suggested-url">
            <strong>OpenFrame URL:</strong> 
            <a :href="suggestedUrl" target="_blank" rel="noopener">{{ suggestedUrl }}</a>
          </div>
        </div>

        <div class="divider">
          <span class="divider-text">Step 2 Choose registration</span>
        </div>

        <!-- Step 2: Registration options -->
        <div class="form-section">
          <!-- Google Sign Up -->
          <button 
            type="button"
            @click="handleGoogleSignUp"
            class="auth-button google"
            :disabled="loading || !organizationAvailable"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <!-- Microsoft Sign Up (commented out as requested) -->
          <!--
          <button 
            type="button"
            @click="handleMicrosoftSignUp"
            class="auth-button microsoft"
            :disabled="loading || !organizationAvailable"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/>
            </svg>
            Sign in with Microsoft
          </button>
          -->

          <!-- OpenFrame Sign Up (manual) -->
          <button 
            type="button"
            @click="toggleManualSignUp"
            class="auth-button openframe"
            :disabled="loading || !organizationAvailable"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Sign up with OpenFrame
          </button>
        </div>

        <!-- Manual registration form -->
        <div v-if="showManualForm" class="manual-form">
          <div class="form-row">
            <div class="form-group">
              <input 
                v-model="firstName" 
                type="text" 
                placeholder="First name"
                class="form-input"
                required 
                :disabled="loading"
              />
            </div>
            <div class="form-group">
              <input 
                v-model="lastName" 
                type="text" 
                placeholder="Last name"
                class="form-input"
                required 
                :disabled="loading"
              />
            </div>
          </div>

          <div class="form-group">
            <input 
              v-model="email" 
              type="email" 
              placeholder="Email address"
              class="form-input"
              required 
              :disabled="loading"
            />
          </div>

          <div class="form-group">
            <input 
              v-model="password" 
              type="password" 
              placeholder="Password"
              class="form-input"
              required 
              :disabled="loading"
              @input="updatePasswordStrength"
            />
            <div v-if="password" class="password-strength">
              <div class="strength-bar">
                <div 
                  class="strength-fill" 
                  :style="{ width: `${passwordStrength.percentage}%` }"
                  :class="passwordStrength.level"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrength.text }}</span>
            </div>
          </div>

          <div class="form-group">
            <input 
              v-model="confirmPassword" 
              type="password" 
              placeholder="Confirm password"
              class="form-input"
              required 
              :disabled="loading"
            />
          </div>

          <button 
            type="submit" 
            class="submit-button"
            :disabled="loading || !isFormValid"
          >
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </div>
      </form>

      <!-- Login link -->
      <div class="login-link">
                  <p>Already have an account? <router-link to="/central-auth-demo">Sign in</router-link></p>
      </div>

      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { AuthService } from '../../services/AuthService'
import { ToastService } from '../../services/ToastService'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toastService = ToastService.getInstance()

// Reactive state
const organizationName = ref('')
const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const organizationLoading = ref(false)
const error = ref('')
const organizationError = ref('')
const organizationAvailable = ref(false)
const suggestedUrl = ref('')
const showManualForm = ref(false)

// Password strength
const passwordStrength = ref({
  percentage: 0,
  level: 'weak',
  text: 'Weak'
})

// For localhost development - make it disabled by default
const isLocalhostFixed = computed(() => {
  return import.meta.env.MODE === 'development'
})

// Computed
const isFormValid = computed(() => {
  return organizationAvailable.value &&
         firstName.value.trim() &&
         lastName.value.trim() &&
         email.value.trim() &&
         password.value &&
         confirmPassword.value &&
         password.value === confirmPassword.value &&
         passwordStrength.value.percentage >= 50
})

// Debounced organization availability check
let organizationCheckTimeout: number | null = null

async function checkOrganizationAvailability() {
  if (!organizationName.value.trim()) {
    organizationAvailable.value = false
    organizationError.value = ''
    suggestedUrl.value = ''
    return
  }

  // Clear previous timeout
  if (organizationCheckTimeout) {
    clearTimeout(organizationCheckTimeout)
  }

  // Debounce the API call
  organizationCheckTimeout = setTimeout(async () => {
    organizationLoading.value = true
    organizationError.value = ''
    
    try {
      const response = await AuthService.checkTenantAvailability(organizationName.value)
      
      if (response.is_available) {
        organizationAvailable.value = true
        organizationError.value = ''
        suggestedUrl.value = response.suggested_url || ''
      } else {
        organizationAvailable.value = false
        organizationError.value = response.message || 'Organization name is not available'
        suggestedUrl.value = ''
      }
    } catch (err: any) {
      organizationAvailable.value = false
      organizationError.value = 'Unable to check availability. Please try again.'
      suggestedUrl.value = ''
    } finally {
      organizationLoading.value = false
    }
  }, 500)
}

function updatePasswordStrength() {
  const pass = password.value
  let score = 0
  
  // Length check
  if (pass.length >= 8) score += 25
  if (pass.length >= 12) score += 25
  
  // Character variety
  if (/[a-z]/.test(pass)) score += 10
  if (/[A-Z]/.test(pass)) score += 10
  if (/[0-9]/.test(pass)) score += 15
  if (/[^a-zA-Z0-9]/.test(pass)) score += 15
  
  passwordStrength.value.percentage = Math.min(score, 100)
  
  if (score < 30) {
    passwordStrength.value.level = 'weak'
    passwordStrength.value.text = 'Weak'
  } else if (score < 60) {
    passwordStrength.value.level = 'medium'
    passwordStrength.value.text = 'Medium'
  } else {
    passwordStrength.value.level = 'strong'
    passwordStrength.value.text = 'Strong'
  }
}

function toggleManualSignUp() {
  showManualForm.value = !showManualForm.value
}

async function handleGoogleSignUp() {
  toastService.showInfo('Google Sign Up not yet implemented')
}

async function handleMicrosoftSignUp() {
  toastService.showInfo('Microsoft Sign Up not yet implemented')
}

async function handleSubmit() {
  if (!isFormValid.value) {
    error.value = 'Please fill in all fields correctly'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const credentials = {
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
      firstName: firstName.value,
      lastName: lastName.value,
      tenantName: organizationName.value
    }

    await authStore.register(
      credentials.email,
      credentials.password,
      credentials.firstName,
      credentials.lastName,
      credentials.tenantName
    )

    toastService.showSuccess('Welcome to OpenFrame! Redirecting to dashboard...')
    
    // Redirect to dashboard
    setTimeout(() => {
      router.push('/dashboard')
    }, 1500)
  } catch (err: any) {
    error.value = err.message || 'Registration failed. Please try again.'
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  // Pre-fill email from query params if available
  if (route.query.email) {
    email.value = route.query.email as string
  }

  // For development, set localhost as default
  if (isLocalhostFixed.value) {
    organizationName.value = 'localhost'
    organizationAvailable.value = true
    suggestedUrl.value = 'http://localhost:3000'
  }
})
</script>

<style scoped>
.register-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--surface-ground);
}

.register-container {
  background: var(--surface-card);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 600px;
  box-shadow: var(--card-shadow);
}

.register-header {
  text-align: center;
  margin-bottom: 2rem;
}

.register-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0 0 0.5rem 0;
}

.register-subtitle {
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
}

.form-section {
  margin-bottom: 2rem;
}

.form-group {
  position: relative;
  margin-bottom: 1rem;
}

.form-input {
  width: 100%;
  padding: 0.875rem 1rem;
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  font-size: 0.95rem;
  background: var(--surface-ground);
  color: var(--text-color);
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.1);
}

.form-input.is-invalid {
  border-color: var(--red-500);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--surface-100);
}

.availability-status {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  font-weight: bold;
}

.availability-status.loading .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--surface-border);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.availability-status.available {
  color: var(--green-500);
}

.availability-status.unavailable {
  color: var(--red-500);
}

.error-text {
  color: var(--red-500);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.suggested-url {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--green-50);
  border: 1px solid var(--green-200);
  border-radius: 6px;
  font-size: 0.9rem;
}

.suggested-url a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.suggested-url a:hover {
  text-decoration: underline;
}

.divider {
  text-align: center;
  margin: 2rem 0;
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

.divider-text {
  background: var(--surface-card);
  padding: 0 1rem;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
  position: relative;
}

.auth-button {
  width: 100%;
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
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.auth-button:last-child {
  margin-bottom: 0;
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

.auth-button.openframe {
  background: var(--primary-color);
  color: white;
}

.auth-button.openframe:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.auth-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.manual-form {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--surface-border);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.password-strength {
  margin-top: 0.5rem;
}

.strength-bar {
  width: 100%;
  height: 4px;
  background: var(--surface-border);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-fill.weak {
  background: var(--red-500);
}

.strength-fill.medium {
  background: var(--yellow-500);
}

.strength-fill.strong {
  background: var(--green-500);
}

.strength-text {
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
  display: block;
}

.submit-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;
}

.submit-button:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-link {
  text-align: center;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--surface-border);
}

.login-link p {
  margin: 0;
  color: var(--text-color-secondary);
  font-size: 0.9rem;
}

.login-link a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
}

.login-link a:hover {
  text-decoration: underline;
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .suggested-url {
    background: var(--green-900);
    border-color: var(--green-700);
  }
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .register-container {
    padding: 1.5rem;
    max-width: 100%;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .auth-button {
    padding: 1rem 1.5rem;
  }
}
</style>