<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>Welcome back</h1>
        <p>Sign in to your account</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <InputText 
            id="email"
            v-model="email" 
            type="email"
            class="w-full"
            placeholder="Enter your email"
            :class="{ 'p-invalid': errors.email }"
          />
          <small class="p-error" v-if="errors.email">{{ errors.email }}</small>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <Password
            id="password"
            v-model="password"
            class="w-full"
            :feedback="false"
            :toggleMask="true"
            placeholder="Enter your password"
            :class="{ 'p-invalid': errors.password }"
            inputClass="w-full"
          />
          <small class="p-error" v-if="errors.password">{{ errors.password }}</small>
        </div>

        <div class="flex align-items-center justify-content-between mb-4">
          <div class="flex align-items-center gap-2">
            <Checkbox v-model="rememberMe" :binary="true" id="rememberMe" />
            <label for="rememberMe" class="cursor-pointer">Remember me</label>
          </div>
          <RouterLink to="/forgot-password" class="text-link">Forgot password?</RouterLink>
        </div>

        <Button 
          type="submit" 
          label="Sign In" 
          class="w-full"
          :loading="loading"
          severity="primary"
          size="large"
        />

        <div class="mt-4 text-center text-sm">
          <span class="text-color-secondary">Don't have an account? </span>
          <RouterLink to="/register" class="text-link font-medium">Sign up</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import { AuthService } from '../services/AuthService';

const router = useRouter();
const email = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);
const errors = ref({
  email: '',
  password: ''
});

const validateForm = () => {
  let isValid = true;
  errors.value = {
    email: '',
    password: ''
  };

  if (!email.value) {
    errors.value.email = 'Email is required';
    isValid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = 'Please enter a valid email';
    isValid = false;
  }

  if (!password.value) {
    errors.value.password = 'Password is required';
    isValid = false;
  }

  return isValid;
};

const handleLogin = async () => {
  if (!validateForm()) return;

  try {
    loading.value = true;
    await AuthService.login({
      email: email.value,
      password: password.value
    });
    router.push('/');
  } catch (error) {
    console.error('Login failed:', error);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-page {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  background: var(--surface-card);
  border-radius: 1rem;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.login-header h1 {
  font-size: 1.875rem;
  font-weight: 600;
  color: #1E1B4B;
  margin-bottom: 0.5rem;
}

.login-header p {
  color: #6b7280;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #1E1B4B;
  font-weight: 500;
  font-size: 0.875rem;
}

.form-group label,
.cursor-pointer {
  color: #1E1B4B;
}

:deep(.p-inputtext) {
  width: 100%;
  padding: 0.75rem 1rem;
}

:deep(.p-password-input) {
  width: 100%;
}

:deep(.p-checkbox) {
  width: 1.25rem;
  height: 1.25rem;
}

:deep(a), 
.text-link,
a.text-link,
RouterLink {
  color: #6EF7D9 !important;
  text-decoration: none;
  transition: color 0.2s;
}

:deep(a:hover),
.text-link:hover {
  color: #9FFAE6 !important;
}

@media screen and (max-width: 640px) {
  .login-card {
    padding: 2rem;
  }
}

:deep(.p-button) {
  background: #00E5BE;
  border-color: #00E5BE;
  padding: 1rem;
}

:deep(.p-button:hover) {
  background: #33eacc;
  border-color: #33eacc;
}

:deep(.p-button.p-button-lg) {
  padding: 1rem;
}

:deep(.p-button:focus) {
  box-shadow: 0 0 0 2px var(--surface-ground), 0 0 0 4px var(--primary-color);
}

:deep(.p-button .p-button-label) {
  font-weight: 600;
  line-height: 1.5;
}

/* Checkbox styling */
:deep(.p-checkbox .p-checkbox-box) {
  border-color: #d1d5db;
}

:deep(.p-checkbox .p-checkbox-box.p-highlight) {
  border-color: #00E5BE;
  background: #00E5BE;
}

:deep(.p-checkbox:hover .p-checkbox-box) {
  border-color: #00E5BE;
}

/* Remember me text */
.cursor-pointer {
  color: #1E1B4B;
  font-size: 0.875rem;
}

/* Secondary text (Don't have an account?) */
.text-color-secondary {
  color: #6b7280;
}

/* Direct selector for the Forgot password link */
a[href="/forgot-password"] {
  color: #00E5BE !important;
}

a[href="/forgot-password"]:hover {
  color: #33eacc !important;
}

/* Direct selector for the Sign up link */
a[href="/register"] {
  color: #00E5BE !important;
}

a[href="/register"]:hover {
  color: #33eacc !important;
}
</style> 