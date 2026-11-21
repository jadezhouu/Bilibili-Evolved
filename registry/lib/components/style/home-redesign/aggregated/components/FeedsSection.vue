<template>
  <SectionShell title="动态" subtitle="关注的人">
    <template #controls>
      <VButton v-if="!needLogin" :disabled="candidates.length === 0" @click="markAllRead">
        全部标记已读
      </VButton>
      <a href="https://t.bilibili.com/?tab=8" target="_blank">
        <VButton round>全部动态</VButton>
      </a>
      <VButton icon title="刷新" @click="load()">
        <VIcon icon="mdi-refresh" :size="18" />
      </VButton>
    </template>
    <div v-if="needLogin" class="aggregated-section-empty">
      <span>登录后查看关注动态</span>
      <a href="https://passport.bilibili.com/login" target="_blank">
        <VButton>去登录</VButton>
      </a>
    </div>
    <template v-else>
      <div v-if="undoCutoff !== null" class="aggregated-inline-error">
        <span>已清空动态</span>
        <VButton @click="undoMarkAll">撤销</VButton>
      </div>
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
            <span>加载动态失败: {{ errorText }}</span>
            <VButton @click="load">重试</VButton>
          </div>
        </template>
      </VideoRow>
    </template>
  </SectionShell>
</template>
<script lang="ts">
import { VButton, VIcon } from '@/ui'
import { getUID } from '@/core/utils'
import type { AggregatedVideoCard, SectionData } from '../types'
import { ReadDisplayOption, ReadModeOption } from '../types'
import { fetchDynamicPage } from '../api/feeds'
import { formatApiError, type BilibiliApiError } from '../api/http'
import { computeView } from '../api/view'
import { readStore } from '../read-store'
import { ensureFeedsCutoffAt, setFeedsCutoffAt, watermarkChangedEvent } from '../watermarks'
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
      default: 2,
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
      cutoffAt: null as number | null,
      undoCutoff: null as number | null,
      undoTimer: null as ReturnType<typeof setTimeout> | null,
      epoch: 0,
      loading: false,
      error: null as BilibiliApiError | null,
      needLogin: !getUID(),
    }
  },
  computed: {
    cards(): AggregatedVideoCard[] {
      // readVersion 用于已读变化后强制重算.
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
      if (this.cutoffAt != null) {
        return '暂无新动态. 从启用时间开始只显示新动态.'
      }
      return '暂无动态, 关注的人发新视频后会出现在这里.'
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
    watermarkChangedEvent.addEventListener('change', this.onWatermarkChanged)
    this.load(this.restored ? 1 : this.maxPages)
  },
  beforeDestroy() {
    this.readUnsubscribe?.()
    watermarkChangedEvent.removeEventListener('change', this.onWatermarkChanged)
    if (this.undoTimer != null) {
      clearTimeout(this.undoTimer)
    }
  },
  methods: {
    isCardRead(key: string): boolean {
      return readStore.has(key)
    },
    markAllRead() {
      if (this.loading) {
        return
      }
      const previous = this.cutoffAt
      const now = Date.now()
      setFeedsCutoffAt(now, false)
      this.cutoffAt = now
      this.epoch++
      this.candidates = []
      this.readAtLoad = new Set()
      this.readVersion++
      this.error = null
      this.undoCutoff = previous
      if (this.undoTimer != null) {
        clearTimeout(this.undoTimer)
      }
      this.undoTimer = setTimeout(() => {
        this.undoCutoff = null
        this.undoTimer = null
      }, 5000)
    },
    undoMarkAll() {
      if (this.undoCutoff == null) {
        return
      }
      const previous = this.undoCutoff
      this.undoCutoff = null
      if (this.undoTimer != null) {
        clearTimeout(this.undoTimer)
        this.undoTimer = null
      }
      setFeedsCutoffAt(previous, false)
      this.epoch++
      this.load()
    },
    onWatermarkChanged() {
      this.epoch++
      this.load()
    },
    async load(maxPages = this.maxPages) {
      if (this.loading) {
        return
      }
      if (!getUID()) {
        this.needLogin = true
        this.loading = false
        return
      }
      this.needLogin = false
      this.loading = true
      this.error = null
      const epoch = ++this.epoch
      const cutoffAt = ensureFeedsCutoffAt()
      this.cutoffAt = cutoffAt
      const collected: AggregatedVideoCard[] = []
      const seen = new Set<string>()
      const filterRead =
        this.readMode !== ReadModeOption.Off &&
        !this.showRead &&
        this.readDisplay !== ReadDisplayOption.DimOnly
      let cursor: string | undefined
      let visibleCount = 0
      try {
        for (let page = 1; page <= maxPages; page++) {
          const data = await fetchDynamicPage(cursor)
          if (epoch !== this.epoch) {
            return
          }
          if (data.rawItems.length === 0) {
            break
          }
          const pageHasNew = data.rawItems.some(
            item => (item.modules?.module_author?.pub_ts ?? 0) * 1000 >= cutoffAt,
          )
          if (!pageHasNew) {
            break
          }
          for (const card of data.cards) {
            if ((card.timestamp ?? 0) < cutoffAt || seen.has(card.readKey)) {
              continue
            }
            seen.add(card.readKey)
            collected.push(card)
            if (!filterRead || !readStore.has(card.readKey)) {
              visibleCount++
            }
          }
          if (visibleCount >= 20 || !data.hasMore || !data.nextCursor) {
            break
          }
          cursor = data.nextCursor
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
        const apiError = error as BilibiliApiError
        if (apiError.code === -101) {
          this.needLogin = true
        } else {
          this.error = apiError
        }
      } finally {
        this.loading = false
      }
    },
  },
})
</script>
