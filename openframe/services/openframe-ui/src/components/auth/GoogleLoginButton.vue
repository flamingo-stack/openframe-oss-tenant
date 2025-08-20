<template>
  <div v-if="shouldShowButton" class="google-login-container">
    <button 
      @click="handleGoogleLogin" 
      class="google-login-button"
      :disabled="!isGoogleEnabled"
    >
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      Continue with Google
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ssoService } from '@/services/SSOService';

const isLoading = ref(true);
const isGoogleEnabled = ref(false);

// Computed properties
const shouldShowButton = computed(() => 
  !isLoading.value && isGoogleEnabled.value
);

onMounted(async () => {
  await loadSSOConfig();
});

async function loadSSOConfig() {
  isLoading.value = true;
  
  try {
    const enabledProviders = await ssoService.getEnabledProviders();
    isGoogleEnabled.value = enabledProviders.some(provider => provider.provider === 'google');
    console.log('🔑 [GoogleLoginButton] Enabled providers loaded:', enabledProviders);
  } catch (err) {
    console.error('Failed to load SSO configuration:', err);
  } finally {
    isLoading.value = false;
  }
}

const handleGoogleLogin = async () => {
  try {
    console.log('🔑 [GoogleLoginButton] Button clicked');
    
    if (!isGoogleEnabled.value) {
      console.error('❌ [GoogleLoginButton] Google OAuth is not enabled');
      return;
    }
    
    // Use standard Spring Security OAuth2 flow
    const authUrl = ssoService.getGoogleAuthUrl();
    console.log('🚀 [GoogleLoginButton] Redirecting to Authorization Server:', authUrl);
    
    // Redirect to Authorization Server
    window.location.href = authUrl;
    
  } catch (error) {
    console.error('❌ [GoogleLoginButton] Error initiating Google login:', error);
  }
};
</script>

<style scoped>
.google-login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.google-login-button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  background: white;
  color: #3c4043;
  font-family: 'Google Sans', Roboto, Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 200px;
  justify-content: center;
}

.google-login-button:hover:not(:disabled) {
  box-shadow: 0 1px 2px 0 rgba(60, 64, 67, 0.30), 0 1px 3px 1px rgba(60, 64, 67, 0.15);
  border-color: #dadce0;
}

.google-login-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 18px;
  height: 18px;
}

.config-error {
  color: #d93025;
  font-size: 12px;
  text-align: center;
}
</style> 