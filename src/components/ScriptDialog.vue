<template>
  <q-dialog v-model="show" maximized>
    <q-card class="q-card--dark q-dark">
      <q-bar class="row no-wrap items-center q-bar--standard q-bar--dark">
        <span class="q-pr-sm">{{ isEdit ? 'Editing script' : 'Adding new script' }}</span>
        <q-space />
        <q-btn flat round dense icon="close" v-close-popup />
      </q-bar>

      <div class="row q-pa-sm">
        <!-- Left side - Form fields -->
        <div class="col-4">
          <q-scroll-area class="q-scrollarea--dark" style="height: 553px">
            <div class="q-gutter-sm q-pr-sm">
              <!-- Name -->
              <q-input
                v-model="form.name"
                label="Name"
                filled
                dense
                dark
                :rules="[val => !!val || 'Name is required']"
              />

              <!-- Description -->
              <q-textarea
                v-model="form.description"
                label="Description"
                filled
                dense
                dark
                rows="2"
              />

              <!-- Shell Type -->
              <q-select
                v-model="form.shell"
                :options="shellOptions"
                label="Shell Type"
                filled
                dense
                dark
                emit-value
                map-options
              />

              <!-- Supported Platforms -->
              <q-select
                v-model="form.supported_platforms"
                :options="platformOptions"
                label="Supported Platforms (All supported if blank)"
                filled
                dense
                dark
                multiple
                use-chips
                emit-value
                map-options
              />

              <!-- Category -->
              <q-select
                v-model="form.category"
                :options="categoryOptions"
                label="Category"
                filled
                dense
                dark
                use-input
                input-debounce="0"
                @filter="filterCategories"
              />

              <!-- Script Arguments -->
              <q-select
                v-model="form.args"
                label="Script Arguments (press Enter after typing each argument)"
                filled
                dense
                dark
                multiple
                use-chips
                use-input
                input-debounce="0"
                @new-value="createValue"
              />

              <!-- Environment vars -->
              <q-select
                v-model="form.env_vars"
                label="Environment vars (press Enter after typing each key=value pair)"
                filled
                dense
                dark
                multiple
                use-chips
                use-input
                input-debounce="0"
                @new-value="createValue"
              />

              <!-- Timeout -->
              <q-input
                v-model.number="form.default_timeout"
                label="Timeout (seconds)"
                type="number"
                filled
                dense
                dark
                :rules="[val => val > 0 || 'Timeout must be greater than 0']"
              />

              <!-- Run As User -->
              <q-checkbox
                v-model="form.run_as_user"
                label="Run As User (Windows only)"
                dark
              />

              <!-- Syntax -->
              <q-textarea
                v-model="form.syntax"
                label="Syntax"
                filled
                dense
                dark
                rows="6"
                style="height: 150px; overflow-y: auto; resize: none;"
              />
            </div>
          </q-scroll-area>
        </div>

        <!-- Right side - Code editor -->
        <div class="col-8">
          <MonacoEditor
            v-model="form.script_body"
            language="powershell"
            theme="vs-dark"
            style="height: 553px"
          />
        </div>
      </div>

      <!-- Bottom actions -->
      <q-card-actions class="justify-start q-card__actions--horiz row">
        <q-select
          v-model="selectedAgent"
          :options="agentOptions"
          label="Agent to run test script on"
          filled
          dense
          dark
          use-input
          input-debounce="0"
          style="width: 450px"
          @filter="filterAgents"
        >
          <template v-slot:append>
            <q-btn flat dense text-primary label="Test Script" :disable="!selectedAgent" @click="testScript" />
            <q-btn flat dense text-secondary label="Test on Server" :disable="!selectedAgent" @click="testOnServer" />
          </template>
        </q-select>

        <q-space />

        <q-btn flat label="Cancel" v-close-popup />
        <q-btn flat color="primary" label="Save" @click="saveScript" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, defineProps, defineEmits } from 'vue'
import MonacoEditor from './MonacoEditor.vue'
import { api } from '../boot/axios'

export default {
  name: 'ScriptDialog',
  components: {
    MonacoEditor
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    script: {
      type: Object,
      default: () => ({})
    }
  },
  emits: ['update:modelValue', 'saved'],
  setup(props, { emit }) {
    const show = ref(props.modelValue)
    const isEdit = ref(!!props.script.id)
    const selectedAgent = ref(null)
    const agentOptions = ref([])

    const form = ref({
      name: props.script.name || '',
      description: props.script.description || '',
      shell: props.script.shell || 'powershell',
      supported_platforms: props.script.supported_platforms || [],
      category: props.script.category || '',
      args: props.script.args || [],
      env_vars: props.script.env_vars || [],
      default_timeout: props.script.default_timeout || 90,
      run_as_user: props.script.run_as_user || false,
      syntax: props.script.syntax || '',
      script_body: props.script.script_body || ''
    })

    const shellOptions = [
      { label: 'Powershell', value: 'powershell' },
      { label: 'CMD', value: 'cmd' },
      { label: 'Shell', value: 'shell' }
    ]

    const platformOptions = [
      { label: 'Windows', value: 'windows' },
      { label: 'Linux', value: 'linux' },
      { label: 'Darwin', value: 'darwin' }
    ]

    const categoryOptions = ref([
      'TRMM (All):3rd Party Software',
      'TRMM (All):Custom Scripts',
      'TRMM (All):System Information'
    ])

    const filterCategories = (val, update, abort) => {
      update(() => {
        const needle = val.toLowerCase()
        categoryOptions.value = categoryOptions.value.filter(
          v => v.toLowerCase().indexOf(needle) > -1
        )
      })
    }

    const filterAgents = (val, update, abort) => {
      update(() => {
        // Implement agent filtering logic here
      })
    }

    const createValue = (val, done) => {
      done(val)
    }

    const testScript = async () => {
      // Implement test script logic
    }

    const testOnServer = async () => {
      // Implement test on server logic
    }

    const saveScript = async () => {
      try {
        const url = isEdit.value 
          ? `/scripts/${props.script.id}/`
          : '/scripts/'
        
        const method = isEdit.value ? 'put' : 'post'
        
        const response = await api[method](url, form.value)
        
        emit('saved', response.data)
        emit('update:modelValue', false)
      } catch (error) {
        console.error('Error saving script:', error)
      }
    }

    return {
      show,
      isEdit,
      form,
      selectedAgent,
      agentOptions,
      shellOptions,
      platformOptions,
      categoryOptions,
      filterCategories,
      filterAgents,
      createValue,
      testScript,
      testOnServer,
      saveScript
    }
  }
}
</script> 