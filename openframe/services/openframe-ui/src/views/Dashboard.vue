<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <button @click="logout">Logout</button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"
import { useAuthStore } from "../stores/auth"

const router = useRouter()
const authStore = useAuthStore()

const logout = () => {
  authStore.logout()
  router.push("/login")
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}
</style>
