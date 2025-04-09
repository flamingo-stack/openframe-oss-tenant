<template>
  <PrimeButton
    :label="label"
    :icon="icon"
    :loading="loading"
    :disabled="disabled"
    :class="[
      'of-button',
      { 'p-button-sm': size === 'small' },
      { 'p-button-lg': size === 'large' },
      { 'p-button-text': variant === 'text' },
      { 'p-button-outlined': variant === 'outlined' },
      { 'p-button-rounded': rounded },
      { 'p-button-icon-only': !label && icon },
      buttonClass
    ]"
    @click="$emit('click', $event)"
  >
    <slot />
  </PrimeButton>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import PrimeButton from 'primevue/button';

const props = defineProps({
  label: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'filled',
    validator: (value: string) => ['filled', 'outlined', 'text'].includes(value)
  },
  severity: {
    type: String,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'success', 'info', 'warning', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  },
  rounded: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
});

const buttonClass = computed(() => {
  const classes = [];
  
  if (props.severity === 'secondary') {
    classes.push(props.variant === 'filled' ? 'p-button-secondary' : '');
  }
  
  if (props.severity !== 'primary') {
    classes.push(`p-button-${props.severity}`);
  }
  
  return classes.join(' ');
});

defineEmits(['click']);
</script>

<style>
.of-button {
  /* Add any custom button styling here */
}
</style>
