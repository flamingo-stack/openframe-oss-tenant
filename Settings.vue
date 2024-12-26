<div class="grid">
  <div v-for="config in filteredConfigs" 
       :key="config.key" 
       :class="{
         'col-12 md:col-6 xl:col-4': isBoolean(config),
         'col-12 md:col-12 xl:col-6': !isBoolean(config)
       }"
       class="mb-3">
    <div class="tool-card">
      <div class="tool-header">
        <div class="tool-header-left">
          <h3>{{ formatTitle(config.key) }}</h3>
        </div>
        <div class="tool-header-right">
          <div class="save-button-wrapper">
            <Button v-if="hasChanges(config.key)"
                    class="p-button-warning"
                    @click="saveConfigProperty(config.key)">
              Save
            </Button>
          </div>
          <div class="tool-tags">
            <Tag :class="getTagClass(config)">{{ getTagLabel(config) }}</Tag>
          </div>
        </div>
      </div>
      <div class="tool-content">
        <div class="edit-field">
          <component :is="getInputComponent(config)"
                    v-model="config.value"
                    class="w-full"
                    :disabled="!isPropertyEditable(config.key)"
                    @update:modelValue="updateConfigValue(config.key, $event)" />
        </div>
      </div>
    </div>
  </div>
</div> 

<script setup>
const isBoolean = (config) => {
  const tag = getTagLabel(config);
  return tag === 'Boolean';
}
</script> 