<template>
  <HomeRedesignBase>
    <div class="aggregated-home">
      <template v-if="visibleSections.length > 0">
        <template v-for="id of visibleSections">
          <LazyMount v-if="id === 'watchlater'" :key="id" root-margin="0px">
            <component
              :is="sectionComponents[id]"
              :read-mode="readModeFor(id)"
              :read-display="readDisplay"
              :show-read="showRead"
              :exposure-dwell="exposureDwell"
              :exposure-threshold="exposureThreshold"
              :exposure-require-interaction="exposureRequireInteraction"
              :restored="Boolean(restoredSections[id])"
            />
          </LazyMount>
          <component
            :is="sectionComponents[id]"
            v-else
            :key="id"
            :read-mode="readModeFor(id)"
            :read-display="readDisplay"
            :show-read="showRead"
            :exposure-dwell="exposureDwell"
            :exposure-threshold="exposureThreshold"
            :exposure-require-interaction="exposureRequireInteraction"
            :restored="Boolean(restoredSections[id])"
          />
        </template>
      </template>
      <div v-else class="aggregated-home-empty">
        <div class="aggregated-home-empty-title">所有板块已隐藏</div>
        <div class="aggregated-home-empty-desc">
          点击左侧设置按钮, 在「聚合首页 → 板块布局」中恢复显示.
        </div>
      </div>
    </div>
  </HomeRedesignBase>
</template>
<script lang="ts">
import { addComponentListener, removeComponentListener } from '@/core/settings'
import { getUID } from '@/core/utils'
import HomeRedesignBase from '../HomeRedesignBase.vue'
import FeedsSection from './components/FeedsSection.vue'
import LazyMount from './components/LazyMount.vue'
import PopularSection from './components/PopularSection.vue'
import WeeklySection from './components/WeeklySection.vue'
import WatchlaterSection from './components/WatchlaterSection.vue'
import { getAggregatedHomeOptions, sectionDefinitions, sectionsChangedEvent } from './options'
import { pinStore } from './pin-store'
import { readStore } from './read-store'
import type { SectionId } from './types'
import { ReadDisplayOption, ReadModeOption } from './types'

const sectionComponents: Record<SectionId, unknown> = {
  feeds: FeedsSection,
  popular: PopularSection,
  weekly: WeeklySection,
  watchlater: WatchlaterSection,
}

export default Vue.extend({
  components: {
    HomeRedesignBase,
    LazyMount,
  },
  data() {
    return {
      sectionOrder: [] as SectionId[],
      hiddenSections: {} as Record<SectionId, boolean>,
      readModes: {
        feeds: ReadModeOption.Click,
        popular: ReadModeOption.Click,
        weekly: ReadModeOption.Click,
      } as Record<'feeds' | 'popular' | 'weekly', ReadModeOption>,
      readDisplay: ReadDisplayOption.DimThenHide,
      showRead: false,
      exposureDwell: 1500,
      exposureThreshold: 50,
      exposureRequireInteraction: true,
      restoredSections: {} as Record<SectionId, boolean>,
      modeTimer: null as ReturnType<typeof setInterval> | null,
    }
  },
  computed: {
    sectionComponents: () => sectionComponents,
    visibleSections(): SectionId[] {
      return this.sectionOrder.filter(id => !this.hiddenSections[id])
    },
  },
  created() {
    // 先加载固定状态, 子板块创建时才能按真实 pin 状态渲染.
    pinStore.init(getUID())
  },
  mounted() {
    readStore.init(getUID())
    this.syncSections()
    sectionsChangedEvent.addEventListener('change', this.syncSections)
    addComponentListener('aggregatedHome.feedsReadMode', this.updateFeedsMode, true)
    addComponentListener('aggregatedHome.popularReadMode', this.updatePopularMode, true)
    addComponentListener('aggregatedHome.weeklyReadMode', this.updateWeeklyMode, true)
    addComponentListener('aggregatedHome.maxWidth', this.applyMaxWidth, true)
    // dev 临时组件不会触发 settings listener, 轮询兜底; 值不变时不会触发重渲染.
    this.modeTimer = setInterval(this.syncReadModes, 800)
  },
  beforeDestroy() {
    sectionsChangedEvent.removeEventListener('change', this.syncSections)
    removeComponentListener('aggregatedHome.feedsReadMode', this.updateFeedsMode)
    removeComponentListener('aggregatedHome.popularReadMode', this.updatePopularMode)
    removeComponentListener('aggregatedHome.weeklyReadMode', this.updateWeeklyMode)
    removeComponentListener('aggregatedHome.maxWidth', this.applyMaxWidth)
    if (this.modeTimer != null) {
      clearInterval(this.modeTimer)
      this.modeTimer = null
    }
  },
  methods: {
    syncSections() {
      this.syncReadModes()
      const { sections } = getAggregatedHomeOptions()
      if (!sections) {
        return
      }
      const previousHidden = this.hiddenSections
      this.sectionOrder = sectionDefinitions
        .map(({ id }) => id)
        .sort((a, b) => sections[a].order - sections[b].order)
      this.hiddenSections = Object.fromEntries(
        sectionDefinitions.map(({ id }) => [id, sections[id].hidden]),
      ) as Record<SectionId, boolean>
      sectionDefinitions.forEach(({ id }) => {
        if (previousHidden[id] && !this.hiddenSections[id]) {
          this.restoredSections = { ...this.restoredSections, [id]: true }
        }
      })
    },
    syncReadModes() {
      const options = getAggregatedHomeOptions()
      this.readModes.feeds = (options.feedsReadMode as ReadModeOption) ?? ReadModeOption.Click
      this.readModes.popular = (options.popularReadMode as ReadModeOption) ?? ReadModeOption.Click
      this.readModes.weekly = (options.weeklyReadMode as ReadModeOption) ?? ReadModeOption.Click
      this.readDisplay = (options.readDisplay as ReadDisplayOption) ?? ReadDisplayOption.DimThenHide
      this.showRead = Boolean(options.showRead)
      this.exposureDwell = Number(options.exposureDwell) || 1500
      this.exposureThreshold = Number(options.exposureThreshold) || 50
      this.exposureRequireInteraction = Boolean(options.exposureRequireInteraction)
    },
    updateFeedsMode(value: ReadModeOption) {
      if (typeof value === 'string') {
        this.readModes.feeds = value
      }
    },
    updatePopularMode(value: ReadModeOption) {
      if (typeof value === 'string') {
        this.readModes.popular = value
      }
    },
    updateWeeklyMode(value: ReadModeOption) {
      if (typeof value === 'string') {
        this.readModes.weekly = value
      }
    },
    applyMaxWidth(width: number) {
      if (typeof width === 'number') {
        document.documentElement.style.setProperty('--home-max-width-override', `${width}px`)
      }
    },
    readModeFor(id: SectionId): ReadModeOption {
      if (id === 'watchlater') {
        return ReadModeOption.Off
      }
      return this.readModes[id]
    },
  },
})
</script>
<style lang="scss">
@import 'common';

.aggregated-home {
  width: 100%;
  max-width: var(--home-max-width, unset);
  padding: 16px 36px;
  @include v-stretch();

  &-empty {
    @include v-center();
    @include v-stretch(8px);
    min-height: 40vh;
    text-align: center;
  }

  &-empty-title {
    @include semi-bold();
    font-size: 20px;
  }

  &-empty-desc {
    color: #888;
  }
}
</style>
