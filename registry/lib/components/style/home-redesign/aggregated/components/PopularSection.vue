<template>
  <SectionShell title="综合热门" subtitle="实时热门">
    <template #controls>
      <a href="https://www.bilibili.com/v/popular/all" target="_blank">
        <VButton round>查看全部</VButton>
      </a>
      <VButton icon title="刷新" @click="load()">
        <VIcon icon="mdi-refresh" :size="18" />
      </VButton>
    </template>
    <div v-if="error && cards.length" class="aggregated-inline-error">
      刷新失败: {{ errorText }}
    </div>
    <VideoRow
      :cards="cards"
      :loading="loading"
      :error="errorText"
      :read-mode="readMode"
      :is-read="isCardRead"
      :exposure-dwell="exposureDwell"
      :exposure-threshold="exposureThreshold"
      :exposure-require-interaction="exposureRequireInteraction"
    >
      <template #empty>
        <div class="aggregated-section-empty">{{ emptyText }}</div>
      </template>
      <template #error>
        <div class="aggregated-section-error">
          <span>加载热门失败: {{ errorText }}</span>
          <VButton @click="load">重试</VButton>
        </div>
      </template>
    </VideoRow>
  </SectionShell>
</template>
<script lang="ts">
import { VButton, VIcon } from '@/ui'
import type { AggregatedVideoCard, SectionData } from '../types'
import { ReadDisplayOption, ReadModeOption } from '../types'
import { getPopularPage } from '../api/popular'
import { formatApiError, type BilibiliApiError } from '../api/http'
import { computeView } from '../api/view'
import { readStore } from '../read-store'
import SectionShell from './SectionShell.vue'
import VideoRow from './VideoRow.vue'

export default Vue.extend({
  components: {
    SectionShell,
    VideoRow,
    VButton,
    VIcon,
  },
  props: {
    readMode: {
      type: String,
      default: ReadModeOption.Click,
    },
    readDisplay: {
      type: String,
      default: ReadDisplayOption.DimThenHide,
    },
    showRead: {
      type: Boolean,
      default: false,
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
    maxPages: {
      type: Number,
      default: 3,
    },
    restored: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      candidates: [] as AggregatedVideoCard[],
      readAtLoad: new Set<string>(),
      readVersion: 0,
      readUnsubscribe: null as (() => void) | null,
      epoch: 0,
      loading: false,
      error: null as BilibiliApiError | null,
    }
  },
  computed: {
    cards(): AggregatedVideoCard[] {
      if (this.readVersion < 0) {
        return []
      }
      const data: SectionData = {
        candidates: this.candidates,
        readAtLoad: this.readAtLoad,
        epoch: this.epoch,
      }
      return computeView(data, {
        mode: this.readMode as ReadModeOption,
        display: this.readDisplay as ReadDisplayOption,
        showRead: this.showRead,
        isRead: key => readStore.has(key),
      })
    },
    emptyText(): string {
      if (this.candidates.length > 0 && this.cards.length === 0) {
        return '这个板块都看过了.'
      }
      return '暂无热门, 或当前热门都看过了.'
    },
    errorText(): string {
      if (!this.error) {
        return ''
      }
      return formatApiError(this.error)
    },
  },
  created() {
    this.readUnsubscribe = readStore.subscribe(() => {
      this.readVersion++
    })
    this.load(this.restored ? 1 : this.maxPages)
  },
  beforeDestroy() {
    this.readUnsubscribe?.()
  },
  methods: {
    isCardRead(key: string): boolean {
      return readStore.has(key)
    },
    async load(maxPages = this.maxPages) {
      if (this.loading) {
        return
      }
      this.loading = true
      this.error = null
      const epoch = ++this.epoch
      const collected: AggregatedVideoCard[] = []
      const seen = new Set<string>()
      const filterRead =
        this.readMode !== ReadModeOption.Off &&
        !this.showRead &&
        this.readDisplay !== ReadDisplayOption.DimOnly
      let visibleCount = 0
      try {
        for (let pn = 1; pn <= maxPages; pn++) {
          const page = await getPopularPage(pn)
          if (epoch !== this.epoch) {
            return
          }
          for (const card of page.cards) {
            if (seen.has(card.readKey)) {
              continue
            }
            seen.add(card.readKey)
            collected.push(card)
            if (!filterRead || !readStore.has(card.readKey)) {
              visibleCount++
            }
          }
          if (visibleCount >= 20 || page.noMore || page.cards.length === 0) {
            break
          }
        }
        if (epoch !== this.epoch) {
          return
        }
        this.candidates = collected
        this.readAtLoad = new Set(
          collected.filter(card => readStore.has(card.readKey)).map(card => card.readKey),
        )
      } catch (error) {
        if (collected.length > 0 && epoch === this.epoch) {
          this.candidates = collected
          this.readAtLoad = new Set(
            collected.filter(card => readStore.has(card.readKey)).map(card => card.readKey),
          )
        }
        this.error = error as BilibiliApiError
      } finally {
        this.loading = false
      }
    },
  },
})
</script>
