<template>
  <div class="profile-page">
    <div class="profile-card">
      <header class="profile-header">
        <h1>Profile</h1>
        <p>Manage your account</p>
      </header>

      <div v-if="loading" class="loading-state">
        Loading profile...
      </div>
      <div v-else class="profile-content">
        <form @submit.prevent="handleUpdate" class="profile-form">
          <div class="grid">
            <div class="col-12 md:col-6">
              <div class="form-group">
                <label for="firstName">First Name</label>
                <InputText 
                  id="firstName"
                  v-model="profile.given_name" 
                  class="w-full"
                  :disabled="!editing"
                />
              </div>
            </div>

            <div class="col-12 md:col-6">
              <div class="form-group">
                <label for="lastName">Last Name</label>
                <InputText 
                  id="lastName"
                  v-model="profile.family_name" 
                  class="w-full"
                  :disabled="!editing"
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <InputText 
              id="email"
              v-model="profile.email" 
              type="email"
              class="w-full"
              disabled
            />
          </div>

          <div class="button-row">
            <Button 
              v-if="!editing"
              type="button" 
              label="Edit Profile" 
              @click="startEditing"
              class="w-full"
              severity="primary"
              size="large"
            />
            <template v-else>
              <Button 
                type="submit" 
                label="Save Changes" 
                :loading="saving"
                class="w-full"
                severity="primary"
                size="large"
              />
              <Button 
                type="button" 
                label="Cancel" 
                @click="cancelEditing"
                class="w-full mt-2"
                severity="secondary"
                size="large"
              />
            </template>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { AuthService } from '../services/AuthService';
import { useAuthStore } from '../stores/auth';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';

const router = useRouter();
const authStore = useAuthStore();
const profile = ref({
  sub: '',
  email: '',
  given_name: '',
  family_name: '',
  email_verified: false,
  name: ''
});

const loading = ref(true);
const error = ref('');
const editing = ref(false);
const saving = ref(false);

const loadProfile = async () => {
  try {
    loading.value = true;
    error.value = '';
    const userInfo = await AuthService.getUserInfo();
    profile.value = userInfo;
  } catch (err: any) {
    error.value = 'Failed to load profile';
    console.error('Profile load error:', err);
    
    // Handle auth errors
    if (err?.response?.status === 401 || err?.message?.includes('Failed to fetch user info')) {
      await authStore.handleAuthError(err);
    }
  } finally {
    loading.value = false;
  }
};

const startEditing = () => {
  editing.value = true;
};

const cancelEditing = () => {
  editing.value = false;
  loadProfile(); // Reset to original values
};

const handleUpdate = async () => {
  try {
    saving.value = true;
    // TODO: Implement update profile API
    editing.value = false;
  } catch (err) {
    error.value = 'Failed to update profile';
    console.error('Profile update error:', err);
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
.profile-page {
  padding: 2rem;
}

.profile-card {
  background: var(--surface-card);
  border-radius: 1rem;
  padding: 2.5rem;
  max-width: 800px;
  margin: 0 auto;
  box-shadow: var(--card-shadow);
}

.profile-header {
  margin-bottom: 2.5rem;
}

.profile-header h1 {
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--text-color);
  margin: 0;
  margin-bottom: 0.5rem;
}

.profile-header p {
  color: var(--text-color-secondary);
  margin: 0;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-color);
  font-weight: 500;
}

.button-row {
  display: flex;
  gap: 1rem;
  justify-content: flex-start;
  margin-top: 2rem;
}

.loading-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-color-secondary);
}

.error-message {
  color: var(--red-500);
  padding: 1rem;
  border-radius: 0.5rem;
  background-color: var(--red-50);
  border: 1px solid var(--red-200);
  margin-bottom: 1rem;
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