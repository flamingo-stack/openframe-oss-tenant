<template>
  <div class="of-progress-wrapper">
    <div class="of-progress-track">
      <div 
        class="of-progress-fill" 
        :style="{ width: `${Math.max(value, minDisplayValue)}%` }"
        :class="{ 
          'high': value >= highThreshold,
          'medium': value >= mediumThreshold && value < highThreshold,
          'low': value < mediumThreshold
        }"
      >
        <span v-if="showLabel" class="of-progress-label">{{ label || `${value}%` }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  value: {
    type: Number,
    required: true,
    validator: (value: number) => value >= 0 && value <= 100
  },
  label: {
    type: String,
    default: ''
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  minDisplayValue: {
    type: Number,
    default: 8 // Minimum visual width percentage
  },
  highThreshold: {
    type: Number,
    default: 80
  },
  mediumThreshold: {
    type: Number,
    default: 50
  }
});
</script>

<style>
.of-progress-wrapper {
  padding: 0.5rem 0;
}

.of-progress-track {
  background: var(--surface-hover);
  border-radius: 1rem;
  height: 2.5rem;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
}

.of-progress-fill {
  height: 100%;
  position: relative;
  border-radius: 1rem;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.of-progress-fill.high {
  background: var(--green-500);
}

.of-progress-fill.medium {
  background: var(--yellow-500);
}

.of-progress-fill.low {
  background: var(--red-500);
}

.of-progress-label {
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
  letter-spacing: 0.5px;
}
</style>
