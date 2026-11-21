<template>
  <div class="aggregated-video-row" :class="{ 'not-empty': cards.length > 0 }">
    <div v-if="loading && cards.length === 0" class="aggregated-video-row-state">
      <slot name="loading">
        <VLoading />
      </slot>
    </div>
    <div v-else-if="error && cards.length === 0" class="aggregated-video-row-state">
      <slot name="error" :error="error">
        <div class="aggregated-video-row-error">{{ error }}</div>
      </slot>
    </div>
    <div v-else-if="cards.length === 0" class="aggregated-video-row-state">
      <slot name="empty">
        <VEmpty />
      </slot>
    </div>
    <div v-else ref="content" class="aggregated-video-row-content" @scroll="updateScrollState">
      <ReadableVideoCard
        v-for="card of cards"
        :key="card.readKey"
        :data="card"
        :read="isCardRead(card.readKey)"
        :read-mode="readMode"
        :hide-watchlater="hideWatchlater"
      />
    </div>
    <button
      v-if="cards.length > 0 && canScrollLeft"
      class="aggregated-video-row-arrow left"
      title="向左滚动"
      @click="scrollPage(-1)"
    >
      ‹
    </button>
    <button
      v-if="cards.length > 0 && canScrollRight"
      class="aggregated-video-row-arrow right"
      title="向右滚动"
      @click="scrollPage(1)"
    >
      ›
    </button>
  </div>
</template>
<script lang="ts">
import { PropType } from 'vue'
import { VEmpty, VLoading } from '@/ui'
import { ExposureTracker } from '../exposure'
import { readStore } from '../read-store'
import type { AggregatedVideoCard, SectionId } from '../types'
import { ReadModeOption } from '../types'
import ReadableVideoCard from './ReadableVideoCard.vue'

export default Vue.extend({
  components: {
    ReadableVideoCard,
    VEmpty,
    VLoading,
  },
  props: {
    cards: {
      type: Array as PropType<AggregatedVideoCard[]>,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
    hideWatchlater: {
      type: Boolean,
      default: false,
    },
    readMode: {
      type: String,
      default: ReadModeOption.Off,
    },
    isRead: {
      type: Function as PropType<(key: string) => boolean>,
      default: () => false,
    },
    exposureDwell: {
      type: Number,
      default: 1500,
    },
    exposureThreshold: {
      type: Number,
      default: 50,
    },
    exposureRequireInteraction: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      canScrollLeft: false,
      canScrollRight: false,
    }
  },
  watch: {
    cards() {
      this.setupExposure()
      this.$nextTick(this.updateScrollState)
    },
    readMode() {
      this.setupExposure()
    },
  },
  mounted() {
    this.setupExposure()
    window.addEventListener('resize', this.updateScrollState)
    this.$nextTick(this.updateScrollState)
  },
  beforeDestroy() {
    this.getExposureTracker()?.destroy()
    this.setExposureTracker(null)
    window.removeEventListener('resize', this.updateScrollState)
  },
  methods: {
    isCardRead(key: string): boolean {
      return typeof this.isRead === 'function' ? this.isRead(key) : false
    },
    getExposureTracker(): ExposureTracker | null {
      return (this as any).exposureTracker ?? null
    },
    setExposureTracker(tracker: ExposureTracker | null) {
      ;(this as any).exposureTracker = tracker
    },
    setupExposure() {
      this.getExposureTracker()?.destroy()
      this.setExposureTracker(null)
      if (this.readMode !== ReadModeOption.Exposure || this.cards.length === 0) {
        return
      }
      this.$nextTick(() => {
        if (this.readMode !== ReadModeOption.Exposure) {
          return
        }
        const tracker = new ExposureTracker(
          {
            threshold: this.exposureThreshold / 100,
            dwell: this.exposureDwell,
            requireInteraction: this.exposureRequireInteraction,
          },
          element => this.markExposed(element),
        )
        this.setExposureTracker(tracker)
        const root = this.$el as HTMLElement
        tracker.observe(
          Array.from(root.querySelectorAll('.aggregated-video-card')) as HTMLElement[],
        )
      })
    },
    updateScrollState() {
      const content = this.$refs.content as HTMLElement | undefined
      if (!content) {
        this.canScrollLeft = false
        this.canScrollRight = false
        return
      }
      this.canScrollLeft = content.scrollLeft > 1
      this.canScrollRight = content.scrollLeft + content.clientWidth < content.scrollWidth - 1
    },
    scrollPage(direction: number) {
      const content = this.$refs.content as HTMLElement | undefined
      if (!content) {
        return
      }
      content.scrollBy({
        left: direction * Math.max(content.clientWidth * 0.8, 200),
        behavior: 'smooth',
      })
    },
    markExposed(element: HTMLElement) {
      const key = element.getAttribute('data-read-key')
      const source = element.getAttribute('data-read-source')
      if (!key || !source || source === 'watchlater') {
        return
      }
      readStore.mark(key, source as Exclude<SectionId, 'watchlater'>, 'exposure')
    },
  },
})
</script>
<style lang="scss">
@import 'common';
@import 'effects';

.aggregated-video-row {
  @include scroll-mask-x(36px, var(--home-base-color));
  --card-width: 200px;
  --card-height: 250px;
  --card-margin: 0;
  position: relative;
  width: 100%;

  &-content {
    @include h-center();
    @include no-scrollbar();
    gap: 16px;
    padding: 12px 4px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
  }

  &-state {
    @include h-center();
    min-height: calc(var(--card-height) + 24px);
    border: 2px dashed #8884;
    border-radius: var(--home-card-radius);
  }

  &-error {
    color: #e55;
  }

  &-arrow {
    position: absolute;
    top: 50%;
    z-index: 101;
    width: 30px;
    height: 60px;
    border: none;
    border-radius: 6px;
    background: var(--home-card-bg, #fff);
    box-shadow: 0 2px 8px #0003;
    color: var(--home-color, #333);
    cursor: pointer;
    font-size: 26px;
    line-height: 1;
    opacity: 0.85;
    transform: translateY(-50%);

    &:hover {
      opacity: 1;
    }

    &.left {
      left: 0;
    }

    &.right {
      right: 0;
    }
  }
}
</style>
