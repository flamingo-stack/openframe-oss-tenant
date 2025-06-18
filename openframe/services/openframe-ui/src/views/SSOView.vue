<template>
  <div class="container mx-auto p-6">
    <div class="max-w-4xl mx-auto">
      <div class="mb-8">
        <h1 style="font-size: 1.5rem; font-weight: bold; color: var(--text-color); margin-bottom: 0.5rem;">Single Sign-On Configuration</h1>
        <p style="color: var(--text-color-secondary);">Configure OAuth providers for authentication</p>
      </div>
      
      <SSOSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import SSOSettings from '@/components/settings/SSOSettings.vue';
</script> 