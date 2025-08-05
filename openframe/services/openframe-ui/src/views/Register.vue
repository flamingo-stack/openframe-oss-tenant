<template>
  <div class="of-container of-auth">
    <div class="of-content">
      <div class="of-header">
        <h1 class="of-title">Create Account</h1>
      </div>
      <p class="of-text-secondary">Join OpenFrame and start your journey</p>
      <form @submit.prevent="handleSubmit" class="of-form">
        <div class="form-row">
          <div class="of-form-group">
            <label for="firstName" class="of-form-label">First Name</label>
            <InputText id="firstName" v-model="firstName" class="w-full" />
          </div>
          <div class="of-form-group">
            <label for="lastName" class="of-form-label">Last Name</label>
            <InputText id="lastName" v-model="lastName" class="w-full" />
          </div>
        </div>
        <div class="of-form-group">
          <label for="email" class="of-form-label">Email</label>
          <InputText id="email" v-model="email" type="email" class="w-full" />
        </div>
        <div class="of-form-group">
          <label for="tenantDomain" class="of-form-label">Company Domain</label>
          <InputText 
            id="tenantDomain" 
            v-model="tenantDomain" 
            placeholder="company.com" 
            class="w-full" 
          />
          <small class="domain-help">Your team will be redirected to this domain after login</small>
        </div>
        <div class="of-form-group">
          <label for="password" class="of-form-label">Password</label>
          <div class="password-wrapper">
            <input
              id="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="p-inputtext w-full"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showPassword = !showPassword"
            >
              <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
            <div v-if="password" class="password-strength">
              <div class="strength-meter">
                <div
                  class="strength-bar"
                  :class="passwordStrength.class"
                  :style="{ width: passwordStrength.percentage + '%' }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrength.label }}</span>
            </div>
          </div>
        </div>
        <div class="of-form-group">
          <label for="confirmPassword" class="of-form-label">Confirm Password</label>
          <div class="password-wrapper">
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              class="p-inputtext w-full"
            />
            <button
              type="button"
              class="password-toggle"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <i :class="showConfirmPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
            </button>
          </div>
        </div>
        <div class="of-form-group">
          <OFButton type="submit" :loading="loading" class="of-button w-full">Create Account</OFButton>
        </div>
        <div class="of-text-center">
          <p class="of-text-secondary">
            Already have an account? <router-link to="/login" class="of-link">Sign in</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import InputText from 'primevue/inputtext'
import { OFButton } from '@/components/ui'
import { ToastService } from '@/services/ToastService'

const router = useRouter()
const authStore = useAuthStore()
const toastService = ToastService.getInstance()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const tenantDomain = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const passwordStrength = computed(() => {
  const pwd = password.value
  if (!pwd) return { percentage: 0, class: '', label: '' }

  let strength = 0
  let checks = 0

  // Length check
  if (pwd.length >= 8) {
    strength += 25
    checks++
  }

  // Contains number
  if (/\d/.test(pwd)) {
    strength += 25
    checks++
  }

  // Contains lowercase
  if (/[a-z]/.test(pwd)) {
    strength += 25
    checks++
  }

  // Contains uppercase
  if (/[A-Z]/.test(pwd)) {
    strength += 25
    checks++
  }

  let strengthClass = ''
  let label = ''

  if (checks === 4) {
    strengthClass = 'strong'
    label = 'Strong'
  } else if (checks >= 2) {
    strengthClass = 'medium'
    label = 'Medium'
  } else {
    strengthClass = 'weak'
    label = 'Weak'
  }

  return {
    percentage: strength,
    class: strengthClass,
    label
  }
})

const handleSubmit = async () => {
  if (!email.value || !password.value || !firstName.value || !lastName.value || !tenantDomain.value) {
    toastService.showError('Please fill in all fields including company domain')
    return
  }

  if (password.value !== confirmPassword.value) {
    toastService.showError('Passwords do not match')
    return
  }

  if (passwordStrength.value.percentage < 50) {
    toastService.showError('Password is too weak. Please use a stronger password.')
    return
  }

  // Validate domain format (basic)
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$/.test(tenantDomain.value)) {
    toastService.showError('Please enter a valid domain (e.g., company.com)')
    return
  }

  try {
    loading.value = true
    
    // Register with tenant domain
    await authStore.registerWithDomain(
      email.value, 
      password.value, 
      firstName.value, 
      lastName.value, 
      tenantDomain.value
    )
    
    toastService.showSuccess('Welcome to OpenFrame! Redirecting to your domain...')
    
    // Redirect to tenant domain after short delay
    setTimeout(() => {
      window.location.href = `https://${tenantDomain.value}`
    }, 2000)
  } catch (err: any) {
    const errorMessage = err.message || 'Registration failed. Please try again.'
    toastService.showError(errorMessage)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.of-container.of-auth {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
}

.of-content {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 1.5rem;
  width: 100%;
  max-width: 600px;
  box-shadow: var(--card-shadow);
}

.of-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.of-text-secondary {
  text-align: left;
  margin-bottom: 1.5rem;
  color: var(--text-color-secondary);
}

.of-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.of-form-group {
  margin-bottom: 1rem;
}

.of-form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.875rem;
}

:deep(.p-inputtext) {
  width: 100%;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  padding: 0.75rem 1rem;
  color: var(--text-color);
  height: 42px;
  border-radius: var(--border-radius);
}

:deep(.p-password) {
  width: 100%;
  background: var(--surface-ground);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  height: 42px;
  position: relative;
  overflow: visible;
}

:deep(.p-password-input) {
  width: 100%;
  height: 100%;
  border: none !important;
  background: var(--surface-ground) !important;
  padding: 0.75rem 2.5rem 0.75rem 1rem !important;
  margin: 0;
  color: var(--text-color);
  font-family: var(--font-family);
  font-size: 1rem;
  border-radius: var(--border-radius);
}

:deep(.p-password .p-icon) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.2rem;
  height: 1.2rem;
  color: var(--text-color-secondary);
  opacity: 0.7;
}

.of-text-center {
  text-align: center;
  margin-top: var(--of-spacing-md);
}

.of-link {
  color: var(--of-accent);
  text-decoration: none;
  font-weight: 500;
}

.of-link:hover {
  text-decoration: underline;
}

@media screen and (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .of-content {
    padding: 1rem;
  }
}

:deep(.p-password-panel) {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 2px;
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 0.5rem;
}

:deep(.p-password-meter) {
  height: 3px;
  background: var(--surface-border);
  margin: 0;
}

:deep(.p-password-strength) {
  height: 3px;
  transition: all 0.2s ease;
}

:deep(.p-password-strength.weak) {
  background: var(--red-500);
}

:deep(.p-password-strength.medium) {
  background: var(--yellow-500);
}

:deep(.p-password-strength.strong) {
  background: var(--green-500);
}

:deep(.p-password-info) {
  font-size: 0.875rem;
  margin-top: 0.25rem;
  color: var(--text-color-secondary);
}

.password-wrapper {
  position: relative;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.password-toggle:hover {
  opacity: 1;
}

.password-strength {
  position: absolute;
  left: 0;
  right: 0;
  margin-top: 2px;
}

.strength-meter {
  height: 3px;
  background: var(--surface-card);
  border-radius: 1.5px;
  overflow: hidden;
}

.strength-bar {
  height: 100%;
  width: 0;
  transition: all 0.3s ease;
}

.strength-bar.weak {
  background: var(--red-500);
}

.strength-bar.medium {
  background: var(--yellow-500);
}

.strength-bar.strong {
  background: var(--green-500);
}

.strength-text {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
  display: block;
}

.domain-help {
  font-size: 0.75rem;
  color: var(--text-color-secondary);
  margin-top: 0.25rem;
  display: block;
}
</style>  