<template>
  <div 
    ref="containerRef" 
    class="virtual-list-container"
    :style="{ height: containerHeight + 'px' }"
    @scroll="handleScroll"
  >
    <!-- Invisible spacer for items above visible range -->
    <div 
      class="virtual-list-spacer"
      :style="{ height: startOffset + 'px' }"
    ></div>
    
    <!-- Only render visible items -->
    <div 
      v-for="(item, index) in visibleItems" 
      :key="getItemKey(item, startIndex + index)"
      class="virtual-list-item"
      :style="{ height: itemHeight + 'px' }"
    >
      <slot 
        :item="item" 
        :index="startIndex + index"
        :isVisible="true"
      />
    </div>
    
    <!-- Invisible spacer for items below visible range -->
    <div 
      class="virtual-list-spacer"
      :style="{ height: endOffset + 'px' }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from '@vue/runtime-core';

interface Props {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  getItemKey?: (item: any, index: number) => string | number;
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5,
  getItemKey: (item: any, index: number) => item?.id || item?.toolEventId || index
});

const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);

// Calculate visible range
const startIndex = computed(() => {
  return Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan);
});

const endIndex = computed(() => {
  const visibleCount = Math.ceil(props.containerHeight / props.itemHeight);
  return Math.min(
    props.items.length,
    Math.floor(scrollTop.value / props.itemHeight) + visibleCount + props.overscan
  );
});

// Calculate offsets for spacers
const startOffset = computed(() => {
  return startIndex.value * props.itemHeight;
});

const endOffset = computed(() => {
  return (props.items.length - endIndex.value) * props.itemHeight;
});

// Get only visible items
const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value);
});

// Handle scroll events
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

// Expose methods for external use
defineExpose({
  scrollToIndex: (index: number) => {
    if (containerRef.value) {
      containerRef.value.scrollTop = index * props.itemHeight;
    }
  },
  scrollToTop: () => {
    if (containerRef.value) {
      containerRef.value.scrollTop = 0;
    }
  },
  getScrollTop: () => scrollTop.value,
  getVisibleRange: () => ({
    start: startIndex.value,
    end: endIndex.value,
    visible: visibleItems.value.length
  })
});
</script>

<style scoped>
.virtual-list-container {
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.virtual-list-spacer {
  width: 100%;
}

.virtual-list-item {
  width: 100%;
  position: relative;
}
</style> 