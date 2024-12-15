<template>
  <div class="add-host-container">
    <div class="card">
      <h2>Add New Host</h2>
      <form @submit.prevent="handleSubmit" class="p-fluid">
        <div class="field">
          <label for="hostname">Hostname</label>
          <InputText 
            id="hostname" 
            v-model="host.hostname" 
            :class="{'p-invalid': v$.host.hostname.$invalid && submitted}"
            aria-describedby="hostname-help"
          />
          <small id="hostname-help" class="p-error" v-if="v$.host.hostname.$invalid && submitted">
            Hostname is required
          </small>
        </div>

        <div class="field">
          <label for="displayName">Display Name</label>
          <InputText 
            id="displayName" 
            v-model="host.display_name"
            :class="{'p-invalid': v$.host.display_name.$invalid && submitted}"
          />
          <small class="p-error" v-if="v$.host.display_name.$invalid && submitted">
            Display name is required
          </small>
        </div>

        <div class="field">
          <label for="platform">Platform</label>
          <Dropdown
            id="platform"
            v-model="host.platform"
            :options="platforms"
            optionLabel="name"
            optionValue="value"
            placeholder="Select a platform"
            :class="{'p-invalid': v$.host.platform.$invalid && submitted}"
          />
          <small class="p-error" v-if="v$.host.platform.$invalid && submitted">
            Platform is required
          </small>
        </div>

        <div class="button-container">
          <Button type="submit" label="Add Host" class="p-button-primary" />
          <Button type="button" label="Cancel" class="p-button-secondary" @click="goBack" />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { FleetService } from '@/api/FleetService'

const router = useRouter()
const submitted = ref(false)

const host = reactive({
  hostname: '',
  display_name: '',
  platform: ''
})

const platforms = [
  { name: 'Windows', value: 'windows' },
  { name: 'Linux', value: 'linux' },
  { name: 'macOS', value: 'darwin' }
]

const rules = {
  host: {
    hostname: { required },
    display_name: { required },
    platform: { required }
  }
}

const v$ = useVuelidate(rules, { host })

const handleSubmit = async () => {
  submitted.value = true
  const isValid = await v$.value.$validate()

  if (!isValid) {
    return
  }

  try {
    await FleetService.createHost(host)
    router.push('/hosts')
  } catch (error) {
    console.error('Error creating host:', error)
  }
}

const goBack = () => {
  router.push('/hosts')
}
</script>

<style scoped>
.add-host-container {
  padding: 2rem;
}

.card {
  background: var(--surface-card);
  padding: 2rem;
  border-radius: 10px;
  margin: 0 auto;
  max-width: 800px;
}

.button-container {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.field {
  margin-bottom: 1.5rem;
}
</style> 