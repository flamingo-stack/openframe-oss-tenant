import { ref, onMounted, onUnmounted } from '@vue/runtime-core'

export function useScrollDirection() {
  const lastScrollTop = ref(0)
  const isScrollingDown = ref(false)
  
  const handleScroll = () => {
    const st = window.pageYOffset || document.documentElement.scrollTop
    isScrollingDown.value = st > lastScrollTop.value && st > 0
    lastScrollTop.value = st <= 0 ? 0 : st
  }

  onMounted(() => {
    window.addEventListener('scroll', handleScroll)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
  })

  return {
    isScrollingDown
  }
} 