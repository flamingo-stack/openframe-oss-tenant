<template>
  <div class="of-container of-oauth-callback">
    <div class="of-content">
      <div class="of-loading-state" v-if="isProcessing">
        <div class="of-spinner"></div>
        <h2 class="of-title">Completing your sign-in</h2>
        <p class="of-text-secondary">Please wait while we process your authentication...</p>
      </div>
      
      <div class="of-error-state" v-else-if="error">
        <div class="of-error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <h2 class="of-title">Authentication Failed</h2>
        <p class="of-text-secondary">{{ error }}</p>
        <div class="of-actions">
          <OFButton @click="handleRetry" variant="primary">
            Try Again
          </OFButton>
          <OFButton @click="goToLogin" variant="secondary">
            Back to Login
          </OFButton>
        </div>
      </div>
      
      <div class="of-success-state" v-else-if="isSuccess">
        <div class="of-success-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="m9 12 2 2 4-4" stroke="currentColor" stroke-width="2"/>
          </svg>
        </div>
        <h2 class="of-title">Successfully signed in!</h2>
        <p class="of-text-secondary">Redirecting to your dashboard...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { GoogleOAuthService } from '../../services/GoogleOAuthService';
import { ToastService } from '../../services/ToastService';
import { OFButton } from '../../components/ui';

console.log('🔑 [OAuthCallback] ===== SCRIPT SETUP EXECUTED =====');
console.log('🔑 [OAuthCallback] Component is being initialized');
console.log('🔑 [OAuthCallback] Current URL at script setup:', window.location.href);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const toastService = ToastService.getInstance();

const isProcessing = ref(true);
const isSuccess = ref(false);
const error = ref('');

console.log('🔑 [OAuthCallback] Reactive refs initialized');

onMounted(async () => {
  console.log('🔑 [OAuthCallback] ===== COMPONENT MOUNTED =====');
  console.log('🔑 [OAuthCallback] Mounted, processing OAuth callback');
  console.log('🔑 [OAuthCallback] Current URL:', window.location.href);
  console.log('🔑 [OAuthCallback] Route params:', route.params);
  console.log('🔑 [OAuthCallback] Route query:', route.query);
  console.log('🔑 [OAuthCallback] Route path:', route.path);
  console.log('🔑 [OAuthCallback] Route name:', route.name);
  await processOAuthCallback();
});

const processOAuthCallback = async () => {
  try {
    isProcessing.value = true;
    error.value = '';

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    console.log('🔑 [OAuthCallback] URL params:', {
      code: code ? '***' : null,
      state: state ? '***' : null,
      error: errorParam,
      errorDescription
    });

    // Check for OAuth errors from Google
    if (errorParam) {
      let errorMessage = errorDescription || errorParam;
      
      switch (errorParam) {
        case 'access_denied':
          errorMessage = 'You cancelled the Google sign-in process.';
          break;
        case 'invalid_request':
          errorMessage = 'Invalid request to Google. Please try again.';
          break;
        case 'server_error':
          errorMessage = 'Google encountered an error. Please try again.';
          break;
        case 'temporarily_unavailable':
          errorMessage = 'Google sign-in is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = errorDescription || 'An error occurred during Google sign-in.';
      }
      
      console.error('❌ [OAuthCallback] OAuth error from Google:', {
        error: errorParam,
        description: errorDescription
      });
      
      throw new Error(errorMessage);
    }

    // Validate required parameters
    if (!code) {
      throw new Error('No authorization code received from Google.');
    }

    if (!state) {
      throw new Error('No state parameter received from Google.');
    }

    console.log('✅ [OAuthCallback] Valid OAuth parameters received');

    // Handle OAuth callback through service
    console.log('🔑 [OAuthCallback] Calling GoogleOAuthService.handleCallback...');
    const tokenResponse = await GoogleOAuthService.handleCallback(code, state);
    
    console.log('✅ [OAuthCallback] Token exchange successful:', tokenResponse);

    // SECURITY: Tokens are now set as HttpOnly cookies by the server
    // No need to store tokens in localStorage anymore
    console.log('🔑 [OAuthCallback] Tokens automatically set as secure HttpOnly cookies');

    // Update auth store with new authentication state
    console.log('🔑 [OAuthCallback] Updating auth store...');
    authStore.setAuthenticated(true);
    await authStore.checkAuthStatus();
    console.log('🔑 [OAuthCallback] Auth status:', authStore.isAuthenticated);
    
    // Show success state briefly
    isSuccess.value = true;
    toastService.showSuccess('Successfully signed in with Google!');
    
    // Wait a moment to show success state
    console.log('🔑 [OAuthCallback] Showing success state...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Redirect to dashboard
    console.log('🚀 [OAuthCallback] Redirecting to dashboard');
    await router.push('/dashboard');
    console.log('🚀 [OAuthCallback] Redirect completed');
    
  } catch (err) {
    console.error('❌ [OAuthCallback] OAuth callback processing failed:', err);
    
    const errorMessage = err instanceof Error 
      ? err.message 
      : 'An unexpected error occurred during authentication.';
      
    error.value = errorMessage;
    toastService.showError(errorMessage);
  } finally {
    isProcessing.value = false;
  }
};

const handleRetry = () => {
  console.log('🔄 [OAuthCallback] Retrying OAuth flow');
  GoogleOAuthService.initiateLogin();
};

const goToLogin = () => {
  console.log('🚀 [OAuthCallback] Navigating back to login');
  router.push('/login');
};
</script>

<style scoped>
.of-container.of-oauth-callback {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1rem;
  background: var(--surface-ground);
}

.of-content {
  background: var(--surface-card);
  border-radius: var(--border-radius);
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--card-shadow);
  text-align: center;
}

.of-loading-state,
.of-error-state,
.of-success-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.of-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.of-text-secondary {
  margin: 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.of-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--surface-border);
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.of-error-icon {
  color: var(--red-500);
}

.of-success-icon {
  color: var(--green-500);
}

.of-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

@keyframes spin {
  0% { 
    transform: rotate(0deg); 
  }
  100% { 
    transform: rotate(360deg); 
  }
}

@media screen and (max-width: 640px) {
  .of-content {
    padding: 1.5rem;
  }
  
  .of-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .of-actions .of-button {
    width: 100%;
  }
}
</style> 