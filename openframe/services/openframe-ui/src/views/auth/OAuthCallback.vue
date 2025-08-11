<template>
  <div class="oauth-callback">
    <div class="loading-container">
      <div class="spinner"></div>
      <h2>Authenticating...</h2>
      <p>Please wait while we complete your login.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AuthService from '@/services/AuthService'

const router = useRouter()
const authStore = useAuthStore()

onMounted(async () => {
  console.log('🔑 [OAuth Callback] Component mounted')
  console.log('🔑 [OAuth Callback] Current URL:', window.location.href)
  
  try {
    // Extract parameters from URL
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const state = urlParams.get('state')
    const error = urlParams.get('error')
    
    console.log('🔑 [OAuth Callback] Parameters:', { code: !!code, state, error })
    
    if (error) {
      console.error('🔑 [OAuth Callback] OAuth error:', error)
      throw new Error(`OAuth error: ${error}`)
    }
    
    if (!code) {
      console.error('🔑 [OAuth Callback] No authorization code received')
      throw new Error('No authorization code received')
    }
    
    // Exchange authorization code for tokens using standard OAuth2 flow
    console.log('🔑 [OAuth Callback] Exchanging authorization code for tokens...')
    console.log('🔑 [OAuth Callback] VITE_AUTH_URL:', import.meta.env.VITE_AUTH_URL)
    console.log('🔑 [OAuth Callback] redirect_uri:', window.location.origin + window.location.pathname)
    await AuthService.exchangeCodeForTokens(code, state)
    
    // Check if we're now authenticated (cookies should be set by Authorization Server)
    const isAuthenticated = await authStore.checkAuthStatus()
    
    if (isAuthenticated) {
      console.log('🔑 [OAuth Callback] Authentication successful, redirecting to dashboard')
      
      // Check if there's a redirect URL in state or use default
      const redirectUrl = state ? decodeURIComponent(state) : '/'
      await router.push(redirectUrl)
    } else {
      console.error('🔑 [OAuth Callback] Authentication failed after OAuth callback')
      throw new Error('Authentication failed')
    }
    
  } catch (error) {
    console.error('🔑 [OAuth Callback] Error during OAuth callback:', error)
    
    // Redirect to central auth with error message
    await router.push({
      path: '/central-auth-demo',
      query: { 
        error: 'oauth_failed',
        message: error instanceof Error ? error.message : 'OAuth authentication failed'
      }
    })
  }
})
</script>

<style scoped>
.oauth-callback {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-container {
  text-align: center;
  background: white;
  padding: 3rem;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 90%;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

h2 {
  color: #333;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}

p {
  color: #666;
  margin: 0;
  font-size: 1rem;
}
</style> 