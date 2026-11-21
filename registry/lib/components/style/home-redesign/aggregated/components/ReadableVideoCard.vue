<template>
  <div
    class="aggregated-video-card"
    :class="{
      'is-read': read,
      'hide-watchlater': hideWatchlater,
    }"
    :data-read-key="data.readKey"
    :data-read-source="data.source"
    :data-read-mode="readMode"
    @click="onClick"
    @auxclick="onAuxClick"
  >
    <VideoCard v-bind="$attrs" :data="data" orientation="vertical" />
  </div>
</template>
<script lang="ts">
import { PropType } from 'vue'
import VideoCard from '@/components/feeds/VideoCard.vue'
import { readStore } from '../read-store'
import type { AggregatedVideoCard, SectionId } from '../types'
import { ReadModeOption } from '../types'

export default Vue.extend({
  components: {
    VideoCard,
  },
  props: {
    data: {
      type: Object as PropType<AggregatedVideoCard>,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    hideWatchlater: {
      type: Boolean,
      default: false,
    },
    readMode: {
      type: String,
      default: ReadModeOption.Off,
    },
  },
  computed: {
    clickableRead(): boolean {
      return this.readMode !== ReadModeOption.Off && this.data.source !== 'watchlater'
    },
  },
  methods: {
    markRead() {
      if (!this.clickableRead) {
        return
      }
      readStore.mark(
        this.data.readKey,
        this.data.source as Exclude<SectionId, 'watchlater'>,
        'click',
      )
    },
    onClick(event: MouseEvent) {
      if (!this.clickableRead) {
        return
      }
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor || !anchor.classList.contains('video-card')) {
        return
      }
      this.markRead()
    },
    onAuxClick(event: MouseEvent) {
      if (event.button === 1) {
        this.onClick(event)
      }
    },
  },
})
</script>
<style lang="scss">
.aggregated-video-card {
  flex: 0 0 auto;
  scroll-snap-align: start;
  transition: opacity 0.2s ease-out;

  &.is-read {
    opacity: 0.45;
    filter: grayscale(0.6);

    &:hover {
      opacity: 1;
      filter: none;
    }
  }

  &.hide-watchlater .watchlater {
    display: none !important;
  }

  .video-card {
    border-radius: var(--home-card-radius) !important;
    .cover-container {
      border-radius: calc(var(--home-card-radius) - 1px) calc(var(--home-card-radius) - 1px) 0 0 !important;
    }
  }
}
</style>
