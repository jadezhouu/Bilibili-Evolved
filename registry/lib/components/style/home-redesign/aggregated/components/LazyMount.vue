<template>
  <div ref="root" class="aggregated-lazy-mount" :class="{ 'is-loading': !loaded }">
    <slot v-if="loaded" />
  </div>
</template>
<script lang="ts">
import { intersectionObserve } from '@/core/observer'

/**
 * 首屏外懒挂载: 元素接近视口后才渲染 slot.
 * 已加载后不再卸载, 避免滚动时反复请求.
 */
export default Vue.extend({
  props: {
    rootMargin: {
      type: String,
      default: '200px',
    },
  },
  data() {
    return {
      loaded: false,
      observer: null as IntersectionObserver | null,
    }
  },
  mounted() {
    if (typeof IntersectionObserver === 'undefined') {
      this.loaded = true
      return
    }
    const [observer] = intersectionObserve(
      [this.$el as HTMLElement],
      { rootMargin: this.rootMargin },
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.loaded = true
          observer.disconnect()
        }
      },
    )
    this.observer = observer
  },
  beforeDestroy() {
    this.observer?.disconnect()
  },
})
</script>
<style lang="scss" scoped>
.aggregated-lazy-mount {
  width: 100%;

  &.is-loading {
    min-height: 200px;
  }
}
</style>
