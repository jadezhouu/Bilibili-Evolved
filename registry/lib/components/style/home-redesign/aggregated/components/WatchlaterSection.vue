<template>
  <SectionShell title="稍后再看" :subtitle="subtitle">
    <template #controls>
      <a href="https://www.bilibili.com/watchlater/list#/list" target="_blank">
        <VButton round>查看全部</VButton>
      </a>
      <VButton icon title="刷新" @click="load">
        <VIcon icon="mdi-refresh" :size="18" />
      </VButton>
    </template>
    <div v-if="needLogin" class="aggregated-section-empty">
      <span>登录后查看稍后再看</span>
      <a href="https://passport.bilibili.com/login" target="_blank">
        <VButton>去登录</VButton>
      </a>
    </div>
    <template v-else>
      <div v-if="errorText && cards.length" class="aggregated-inline-error">
        刷新失败: {{ errorText }}
      </div>
      <VideoRow
        :cards="cards"
        :loading="loading"
        :error="errorText"
        read-mode="off"
        hide-watchlater
      >
        <template #empty>
          <div class="aggregated-section-empty">
            <span>稍后再看是空的.</span>
            <a href="https://www.bilibili.com/watchlater/list#/list" target="_blank">
              <VButton>去 B 站添加</VButton>
            </a>
          </div>
        </template>
        <template #error>
          <div class="aggregated-section-error">
            <span>加载稍后再看失败: {{ errorText }}</span>
            <VButton @click="load">重试</VButton>
          </div>
        </template>
      </VideoRow>
    </template>
  </SectionShell>
</template>
<script lang="ts">
import type { RawWatchlaterItem } from '@/components/video/watchlater'
import { getUID } from '@/core/utils'
import { formatCount, formatDuration } from '@/core/utils/formatters'
import { VButton, VIcon } from '@/ui'
import type { AggregatedVideoCard } from '../types'
import { fetchWatchlater } from '../api/watchlater'
import { formatApiError, type BilibiliApiError } from '../api/http'
import { toAggregatedCard, toHttps } from '../api/mapping'
import SectionShell from './SectionShell.vue'
import VideoRow from './VideoRow.vue'

const mapWatchlaterItem = (item: RawWatchlaterItem): AggregatedVideoCard => {
  const timestamp = item.pubdate * 1000
  return toAggregatedCard(
    {
      id: item.bvid || `av${item.aid}`,
      aid: item.aid,
      bvid: item.bvid,
      title: item.title,
      coverUrl: toHttps(item.pic) ?? '',
      upName: item.owner.name,
      upID: item.owner.mid,
      upFaceUrl: toHttps(item.owner.face),
      description: item.desc ?? '',
      duration: item.duration,
      durationText: formatDuration(item.duration),
      timestamp,
      time: new Date(timestamp),
      playCount: formatCount(item.stat?.view ?? 0),
      danmakuCount: formatCount(item.stat?.danmaku ?? 0),
      like: formatCount(item.stat?.like ?? 0),
    },
    'watchlater',
  )
}

export default Vue.extend({
  components: {
    SectionShell,
    VideoRow,
    VButton,
    VIcon,
  },
  data() {
    return {
      cards: [] as AggregatedVideoCard[],
      loading: false,
      error: null as BilibiliApiError | null,
      needLogin: !getUID(),
    }
  },
  computed: {
    subtitle(): string {
      return `${this.cards.length} 个视频`
    },
    errorText(): string {
      if (!this.error) {
        return ''
      }
      return formatApiError(this.error)
    },
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
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
      try {
        const result = await fetchWatchlater()
        if ('error' in result) {
          if (result.error.code === -101) {
            this.needLogin = true
          } else {
            this.error = result.error
          }
          return
        }
        this.cards = result.items.map(mapWatchlaterItem)
      } catch (error) {
        this.error = error as BilibiliApiError
      } finally {
        this.loading = false
      }
    },
  },
})
</script>
