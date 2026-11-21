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
    <div v-if="showActions" class="aggregated-video-card-actions">
      <button
        type="button"
        class="aggregated-video-card-action mark-read"
        :disabled="read"
        :title="read ? '已标记已读' : '标记为已读'"
        :aria-label="read ? '已标记已读' : '标记为已读'"
        @click.stop.prevent="markReadManually"
      >
        <VIcon icon="mdi-check" :size="16" />
      </button>
      <button
        type="button"
        class="aggregated-video-card-action pin"
        :class="{ 'is-active': pinned }"
        :title="pinned ? '取消固定' : '固定视频，打开后不自动标记已读'"
        :aria-label="pinned ? '取消固定' : '固定视频'"
        :aria-pressed="pinned ? 'true' : 'false'"
        @click.stop.prevent="togglePin"
      >
        <VIcon :icon="pinned ? 'mdi-pin' : 'mdi-pin-outline'" :size="16" />
      </button>
    </div>
  </div>
</template>
<script lang="ts">
import { PropType } from 'vue'
import VideoCard from '@/components/feeds/VideoCard.vue'
import { VIcon } from '@/ui'
import { pinStore } from '../pin-store'
import { readStore } from '../read-store'
import type { AggregatedVideoCard, SectionId } from '../types'
import { ReadModeOption } from '../types'

export default Vue.extend({
  components: {
    VideoCard,
    VIcon,
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
    pinned: {
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
    showActions(): boolean {
      return this.readMode === ReadModeOption.Click && this.clickableRead
    },
  },
  methods: {
    markAsRead() {
      readStore.mark(
        this.data.readKey,
        this.data.source as Exclude<SectionId, 'watchlater'>,
        'click',
      )
    },
    markReadByClick() {
      if (!this.clickableRead || pinStore.has(this.data.readKey)) {
        return
      }
      this.markAsRead()
    },
    markReadManually() {
      if (!this.showActions || this.read) {
        return
      }
      pinStore.unpin(this.data.readKey)
      this.markAsRead()
    },
    togglePin() {
      if (!this.showActions) {
        return
      }
      pinStore.toggle(this.data.readKey)
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
      this.markReadByClick()
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
  position: relative;
  flex: 0 0 auto;
  scroll-snap-align: start;
  transition: opacity 0.2s ease-out;

  &-actions {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    z-index: 2;
    display: flex;
    justify-content: space-between;
    pointer-events: none;
  }

  &-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: #000a;
    box-shadow: 0 2px 8px #0003;
    color: #fff;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.15s ease-out, background-color 0.15s ease-out;

    &:hover,
    &:focus-visible {
      background: #000c;
      opacity: 1;
      pointer-events: auto;
    }

    &.is-active {
      background: var(--theme-color, #00a1d6);
      opacity: 1;
      pointer-events: auto;
    }

    &:disabled,
    &:disabled:hover {
      background: #0006;
      color: #ffffff80;
      cursor: default;
    }
  }

  &:hover &-action,
  &:focus-within &-action {
    opacity: 1;
    pointer-events: auto;
  }

  @media (hover: none) {
    &-action {
      opacity: 1;
      pointer-events: auto;
    }
  }

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
