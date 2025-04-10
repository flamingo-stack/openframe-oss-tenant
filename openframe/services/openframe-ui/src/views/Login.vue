<template>
  <div class="of-container of-auth">
    <div class="of-content">
      <div class="of-header">
        <h1 class="of-title">Welcome back</h1>
      </div>
      <p class="of-text-secondary">Sign in to access your account</p>
      <form @submit.prevent="handleSubmit" class="of-form">
        <div class="of-form-group">
          <label for="email" class="of-form-label">Email</label>
          <InputText id="email" v-model="email" type="email" class="w-full" />
        </div>
        <div class="of-form-group">
          <label for="password" class="of-form-label">Password</label>
          <Password id="password" v-model="password" :feedback="false" toggleMask class="w-full" />
        </div>
        <div class="of-form-group">
          <OFButton type="submit" :loading="loading" class="of-button w-full">Sign In</OFButton>
        </div>
        <div class="of-text-center">
          <p class="of-text-secondary">
            Don't have an account? <router-link to="/register" class="of-link">Create one</router-link>
          </p>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ToastService } from '../services/ToastService'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { OFButton } from '../components/ui'

const router = useRouter()
const authStore = useAuthStore()
const toastService = ToastService.getInstance()

const email = ref('')
const password = ref('')
const loading = ref(false)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toastService.showSuccess('Text copied to clipboard')
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const handleSubmit = async () => {
  if (!email.value || !password.value) {
    toastService.showError('Please enter both email and password');
    return;
  }

  try {
    loading.value = true;
    console.log('🔑 [Login] Starting login process');
    const response = await authStore.login(email.value, password.value);
    console.log('✅ [Login] Login successful, response:', response);
    toastService.showSuccess('Login successful!');
    
    // Wait a moment to ensure tokens are stored
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('🚀 [Login] Navigating to dashboard');
    router.push('/dashboard');
  } catch (error: any) {
    console.error('❌ [Login] Login failed:', error);
    toastService.showError(error.message || 'Login failed. Please try again.');
  } finally {
    loading.value = false;
  }
};

const handleOAuthError = (error: any) => {
  toastService.showError(error.message || 'Authentication failed')
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
  max-width: 420px;
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
}

:deep(.p-password-input) {
  width: 100%;
  height: 100%;
  border: none !important;
  background: transparent !important;
  padding: 0.75rem 2.5rem 0.75rem 1rem !important;
  margin: 0;
}

:deep(.p-password .p-icon) {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.2rem;
  height: 1.2rem;
  color: var(--text-color-secondary);
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
  .of-content {
    padding: 1rem;
  }
}
</style>  