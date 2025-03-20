<template>
  <q-page class="q-pa-md">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="q-card--dark">
          <q-card-section>
            <div class="row items-center">
              <div class="text-h6">Scripts</div>
              <q-space />
              <q-btn color="primary" icon="add" label="Add Script" @click="showAddDialog" />
            </div>
          </q-card-section>

          <q-card-section>
            <q-table
              :rows="scripts"
              :columns="columns"
              row-key="id"
              :loading="loading"
              :pagination.sync="pagination"
              @request="onRequest"
              flat
              bordered
              dark
              class="q-table--dark"
            >
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn-group flat>
                    <q-btn flat round size="sm" color="primary" icon="edit" @click="showEditDialog(props.row)" />
                    <q-btn flat round size="sm" color="negative" icon="delete" @click="confirmDelete(props.row)" />
                  </q-btn-group>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Script Dialog -->
    <ScriptDialog
      v-model="showDialog"
      :script="selectedScript"
      @saved="onScriptSaved"
    />
  </q-page>
</template>

<script>
import { ref, onMounted } from 'vue'
import { api } from '../boot/axios'
import ScriptDialog from '../components/ScriptDialog.vue'

export default {
  name: 'Scripts',
  components: {
    ScriptDialog
  },
  setup() {
    const loading = ref(false)
    const scripts = ref([])
    const showDialog = ref(false)
    const selectedScript = ref({})
    const pagination = ref({
      sortBy: 'name',
      descending: false,
      page: 1,
      rowsPerPage: 10,
      rowsNumber: 0
    })

    const columns = [
      { name: 'name', label: 'Name', field: 'name', sortable: true },
      { name: 'description', label: 'Description', field: 'description', sortable: true },
      { name: 'shell', label: 'Shell', field: 'shell', sortable: true },
      { name: 'category', label: 'Category', field: 'category', sortable: true },
      { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
    ]

    const fetchScripts = async () => {
      loading.value = true
      try {
        const response = await api.get('/scripts/')
        scripts.value = response.data
        pagination.value.rowsNumber = response.data.length
      } catch (error) {
        console.error('Error fetching scripts:', error)
      } finally {
        loading.value = false
      }
    }

    const onRequest = async (props) => {
      loading.value = true
      try {
        const response = await api.get('/scripts/')
        scripts.value = response.data
        pagination.value.rowsNumber = response.data.length
      } catch (error) {
        console.error('Error fetching scripts:', error)
      } finally {
        loading.value = false
      }
    }

    const showAddDialog = () => {
      selectedScript.value = {}
      showDialog.value = true
    }

    const showEditDialog = (script) => {
      selectedScript.value = { ...script }
      showDialog.value = true
    }

    const confirmDelete = async (script) => {
      try {
        await api.delete(`/scripts/${script.id}/`)
        await fetchScripts()
      } catch (error) {
        console.error('Error deleting script:', error)
      }
    }

    const onScriptSaved = () => {
      fetchScripts()
    }

    onMounted(() => {
      fetchScripts()
    })

    return {
      loading,
      scripts,
      columns,
      pagination,
      showDialog,
      selectedScript,
      onRequest,
      showAddDialog,
      showEditDialog,
      confirmDelete,
      onScriptSaved
    }
  }
}
</script> 