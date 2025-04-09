<template>
  <div v-if="isDevelopment" class="auth-debug">
    <p>Token present: {{ !!token }}</p>
    <p>Token: {{ maskedToken }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isDevelopment = import.meta.env.DEV;
const token = ref<string | null>(null);
const maskedToken = ref<string>('');

onMounted(() => {
  token.value = localStorage.getItem('access_token');
  if (token.value) {
    maskedToken.value = `${token.value.substring(0, 10)}...${token.value.substring(token.value.length - 10)}`;
  }
});
</script>

<style scoped>
.auth-debug {
  position: fixed;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 9999;
}
</style> 