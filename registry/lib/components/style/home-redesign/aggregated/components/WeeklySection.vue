<template>
  <SectionShell title="每周必看" :subtitle="subtitle">
    <template #controls>
      <VButton :disabled="isLatest" @click="goLatest">最新</VButton>
      <select
        v-model.number="selectedYear"
        class="aggregated-weekly-select"
        title="年份"
        @change="onYearChange"
      >
        <option v-for="year of years" :key="year" :value="year">{{ year }}</option>
      </select>
      <select
        v-model.number="selectedIssueNumber"
        class="aggregated-weekly-select"
        title="期数"
        @change="onIssueChange"
      >
        <option v-for="item of yearIssues" :key="item.number" :value="item.number">
          第{{ item.number }}期 · {{ item.subject }}
        </option>
      </select>
      <VButton icon title="上一期" :disabled="!canPrev" @click="goPrev">
        <VIcon icon="left-arrow" :size="18" />
      </VButton>
      <VButton icon title="下一期" :disabled="!canNext" @click="goNext">
        <VIcon icon="right-arrow" :size="18" />
      </VButton>
      <a :href="weeklyUrl" target="_blank">
        <VButton round>查看全部</VButton>
      </a>
      <VButton icon title="刷新" @click="load(true)">
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
          <span>加载每周必看失败: {{ errorText }}</span>
          <VButton @click="load()">重试</VButton>
        </div>
      </template>
    </VideoRow>
  </SectionShell>
</template>
<script lang="ts">
import { VButton, VIcon } from '@/ui'
import type { AggregatedVideoCard, SectionData, WeeklyIssue, WeeklyIssueSummary } from '../types'
import { ReadDisplayOption, ReadModeOption } from '../types'
import { fetchWeeklyIssue, fetchWeeklyList } from '../api/weekly'
import { getAggregatedHomeOptions } from '../options'
import { formatApiError, type BilibiliApiError } from '../api/http'
import { computeView } from '../api/view'
import { pinStore } from '../pin-store'
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
  },
  data() {
    return {
      candidates: [] as AggregatedVideoCard[],
      readAtLoad: new Set<string>(),
      readVersion: 0,
      readUnsubscribe: null as (() => void) | null,
      pinUnsubscribe: null as (() => void) | null,
      epoch: 0,
      requestId: 0,
      issue: null as WeeklyIssue | null,
      weeklyList: [] as WeeklyIssueSummary[],
      selectedYear: 0,
      selectedIssueNumber: null as number | null,
      loading: false,
      error: null as BilibiliApiError | null,
    }
  },
  computed: {
    subtitle(): string {
      if (!this.issue) {
        return '最新一期'
      }
      const base = `第${this.issue.number}期 · ${this.issue.subject}`
      if (this.readMode === ReadModeOption.Off || this.candidates.length === 0) {
        return base
      }
      return `${base} · ${this.readSummary}`
    },
    readSummary(): string {
      if (this.readVersion < 0) {
        return ''
      }
      const total = this.candidates.length
      const read = this.candidates.filter(card => readStore.has(card.readKey)).length
      return `已读 ${read}/${total}`
    },
    weeklyUrl(): string {
      if (!this.issue) {
        return 'https://www.bilibili.com/v/popular/weekly'
      }
      return `https://www.bilibili.com/v/popular/weekly?num=${this.issue.number}`
    },
    years(): number[] {
      const years = Array.from(new Set<number>(this.weeklyList.map(item => item.year)))
      return years.sort((a, b) => b - a)
    },
    yearIssues(): WeeklyIssueSummary[] {
      return this.weeklyList
        .filter(item => item.year === this.selectedYear)
        .sort((a, b) => b.number - a.number)
    },
    currentIndex(): number {
      if (!this.issue) {
        return -1
      }
      return this.weeklyList.findIndex(item => item.number === this.issue.number)
    },
    isLatest(): boolean {
      return this.weeklyList.length === 0 || this.currentIndex === 0
    },
    canPrev(): boolean {
      return this.currentIndex >= 0 && this.currentIndex < this.weeklyList.length - 1
    },
    canNext(): boolean {
      return this.currentIndex > 0
    },
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
        isPinned: key => pinStore.has(key),
      })
    },
    emptyText(): string {
      if (this.candidates.length > 0 && this.cards.length === 0) {
        return '本期已看完.'
      }
      return '本期暂无内容.'
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
    this.pinUnsubscribe = pinStore.subscribe(() => {
      this.readVersion++
    })
    this.load()
  },
  beforeDestroy() {
    this.readUnsubscribe?.()
    this.pinUnsubscribe?.()
  },
  methods: {
    isCardRead(key: string): boolean {
      return readStore.has(key)
    },
    applyCandidates(cards: AggregatedVideoCard[]) {
      this.candidates = cards
      this.readAtLoad = new Set(
        cards.filter(card => readStore.has(card.readKey)).map(card => card.readKey),
      )
    },
    applyIssue(issue: WeeklyIssue) {
      this.issue = issue
      this.applyCandidates(issue.cards)
      this.selectedIssueNumber = issue.number
      const summary = this.weeklyList.find(item => item.number === issue.number)
      if (summary) {
        this.selectedYear = summary.year
      }
      this.commitSelection(issue)
    },
    commitSelection(issue: WeeklyIssue) {
      const options = getAggregatedHomeOptions()
      const latest = this.weeklyList[0]?.number
      if (issue.number === latest) {
        options.weeklyFollowLatest = true
        options.weeklyIssue = 0
      } else {
        options.weeklyFollowLatest = false
        options.weeklyIssue = issue.number
      }
    },
    async load(force = false) {
      if (this.loading) {
        return
      }
      this.loading = true
      this.error = null
      const requestId = ++this.requestId
      try {
        const list = await fetchWeeklyList(force)
        this.weeklyList = list
        if (list.length === 0) {
          this.issue = null
          this.applyCandidates([])
          return
        }
        const options = getAggregatedHomeOptions()
        const preferred =
          this.selectedIssueNumber ??
          (options.weeklyFollowLatest ? null : options.weeklyIssue || null)
        const target =
          preferred == null ? list[0] : list.find(item => item.number === preferred) ?? list[0]
        if (!target) {
          return
        }
        const issue = await fetchWeeklyIssue(target.number, force)
        if (requestId !== this.requestId) {
          return
        }
        this.applyIssue(issue)
      } catch (error) {
        if (requestId === this.requestId) {
          this.error = error as BilibiliApiError
        }
      } finally {
        if (requestId === this.requestId) {
          this.loading = false
        }
      }
    },
    async selectIssue(number: number) {
      if (!Number.isFinite(number)) {
        return
      }
      const requestId = ++this.requestId
      this.loading = true
      this.error = null
      try {
        const issue = await fetchWeeklyIssue(number)
        if (requestId !== this.requestId) {
          return
        }
        this.applyIssue(issue)
      } catch (error) {
        if (requestId === this.requestId) {
          this.error = error as BilibiliApiError
          this.selectedIssueNumber = this.issue?.number ?? null
        }
      } finally {
        if (requestId === this.requestId) {
          this.loading = false
        }
      }
    },
    onYearChange() {
      const first = this.weeklyList
        .filter(item => item.year === this.selectedYear)
        .sort((a, b) => b.number - a.number)[0]
      if (first) {
        this.selectIssue(first.number)
      }
    },
    onIssueChange() {
      if (this.selectedIssueNumber != null) {
        this.selectIssue(this.selectedIssueNumber)
      }
    },
    goLatest() {
      const latest = this.weeklyList[0]
      if (latest) {
        this.selectIssue(latest.number)
      }
    },
    goPrev() {
      if (this.canPrev) {
        this.selectIssue(this.weeklyList[this.currentIndex + 1].number)
      }
    },
    goNext() {
      if (this.canNext) {
        this.selectIssue(this.weeklyList[this.currentIndex - 1].number)
      }
    },
  },
})
</script>
<style lang="scss">
.aggregated-weekly-select {
  max-width: 160px;
  height: 28px;
  border: 1px solid #8884;
  border-radius: 6px;
  background: var(--home-background-color);
  color: var(--home-color);
  font-size: 12px;
}
</style>
