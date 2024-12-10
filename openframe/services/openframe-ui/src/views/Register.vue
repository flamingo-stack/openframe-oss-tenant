<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1>Create Account</h1>
        <p>Sign up for OpenFrame</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="login-form">
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
            :feedback="true"
            :toggleMask="true"
            placeholder="Enter your password"
            :class="{ 'p-invalid': errors.password }"
            inputClass="w-full"
          />
          <small class="p-error" v-if="errors.password">{{ errors.password }}</small>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Confirm Password</label>
          <Password
            id="confirmPassword"
            v-model="confirmPassword"
            class="w-full"
            :feedback="false"
            :toggleMask="true"
            placeholder="Confirm your password"
            :class="{ 'p-invalid': errors.confirmPassword }"
            inputClass="w-full"
          />
          <small class="p-error" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</small>
        </div>

        <Button 
          type="submit" 
          label="Sign Up" 
          class="w-full"
          :loading="loading"
          severity="primary"
          size="large"
        />

        <div class="mt-4 text-center text-sm">
          <span class="text-color-secondary">Already have an account? </span>
          <RouterLink to="/login" class="text-link font-medium">Sign in</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { AuthService } from '../services/AuthService';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';

const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errors = ref({
  email: '',
  password: '',
  confirmPassword: ''
});

const validateForm = () => {
  let isValid = true;
  errors.value = {
    email: '',
    password: '',
    confirmPassword: ''
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
  } else if (password.value.length < 8) {
    errors.value.password = 'Password must be at least 8 characters';
    isValid = false;
  }

  if (password.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match';
    isValid = false;
  }

  return isValid;
};

const handleRegister = async () => {
  if (!validateForm()) return;

  try {
    loading.value = true;
    await AuthService.register({
      email: email.value,
      password: password.value,
      confirmPassword: confirmPassword.value
    });
    
    // After successful registration, log the user in
    await AuthService.login({
      email: email.value,
      password: password.value
    });
    
    router.push('/');
  } catch (error) {
    console.error('Registration failed:', error);
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
  color: var(--text-color);
  margin: 0;
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.login-header p {
  color: var(--text-color-secondary);
  margin: 0;
  font-size: 1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.875rem;
}

:deep(.p-inputtext) {
  width: 100%;
  padding: 0.75rem 1rem;
}

:deep(.p-password-input) {
  width: 100%;
}

.text-link {
  color: #00E5BE;  /* Brand teal from pitch deck */
  text-decoration: none;
  transition: color 0.2s;
}

.text-link:hover {
  color: #33eacc;
  text-decoration: underline;
}

.text-color-secondary {
  color: var(--text-secondary);
}

/* Form text */
.form-group label {
  color: var(--text-primary);
  font-weight: 500;
}

/* Button styling */
:deep(.p-button) {
  background-color: #00E5BE;
  border-color: #00E5BE;
}

:deep(.p-button:hover) {
  background-color: #33eacc;
  border-color: #33eacc;
}

/* Checkbox and other PrimeVue overrides */
:deep(.p-checkbox .p-checkbox-box.p-highlight) {
  border-color: #00E5BE;
  background: #00E5BE;
}

:deep(.p-checkbox:hover .p-checkbox-box) {
  border-color: #00E5BE;
}

@media screen and (max-width: 640px) {
  .login-card {
    padding: 2rem;
  }
}

:deep(.p-button) {
  padding: 1rem;
  font-weight: 500;
  font-size: 1rem;
  border-radius: 0.5rem;
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
</style> 