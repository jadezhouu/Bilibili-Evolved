import { defineOptionsMetadata } from '@/components/define'
import type { OptionsOfMetadata } from '@/components/define'
import { getComponentSettings } from '@/core/settings'
import { getNumberValidator } from '@/core/utils'
import { ReadDisplayOption, ReadModeOption, type SectionId, type SectionsSettings } from './types'

export interface SectionDefinition {
  id: SectionId
  displayName: string
}

/** 首页上的固定板块顺序, 仅用于默认值与 ExtraOptions 展示. */
export const sectionDefinitions: SectionDefinition[] = [
  { id: 'feeds', displayName: '动态' },
  { id: 'popular', displayName: '综合热门' },
  { id: 'weekly', displayName: '每周必看' },
  { id: 'watchlater', displayName: '稍后再看' },
]

export const createDefaultSections = (): SectionsSettings => ({
  feeds: { order: 1, hidden: false },
  popular: { order: 2, hidden: false },
  weekly: { order: 3, hidden: false },
  watchlater: { order: 4, hidden: false },
})

export const aggregatedHomeOptionsMetadata = defineOptionsMetadata({
  sections: {
    displayName: '板块布局',
    defaultValue: createDefaultSections(),
    // 由 ExtraOptions 渲染, 不在通用选项列表中重复展示.
    hidden: true,
  },
  weeklyFollowLatest: {
    defaultValue: true,
    hidden: true,
  },
  weeklyIssue: {
    // 0 表示没有固定期数, 避免 settings Proxy 处理 null.
    defaultValue: 0,
    hidden: true,
  },
  feedsCutoffAt: {
    // 未设置时由 ensureFeedsCutoffAt 写入当前时间.
    defaultValue: undefined as number | undefined,
    hidden: true,
  },
  feedsReadMode: {
    displayName: '动态已读',
    defaultValue: ReadModeOption.Click,
    dropdownEnum: ReadModeOption,
  },
  popularReadMode: {
    displayName: '热门已读',
    defaultValue: ReadModeOption.Click,
    dropdownEnum: ReadModeOption,
  },
  weeklyReadMode: {
    displayName: '每周已读',
    defaultValue: ReadModeOption.Click,
    dropdownEnum: ReadModeOption,
  },
  readDisplay: {
    displayName: '已读展示',
    defaultValue: ReadDisplayOption.DimThenHide,
    dropdownEnum: ReadDisplayOption,
  },
  showRead: {
    displayName: '总是显示已读',
    defaultValue: false,
  },
  exposureDwell: {
    displayName: '曝光停留 (ms)',
    defaultValue: 1500,
    validator: getNumberValidator(500, 5000),
  },
  exposureThreshold: {
    displayName: '曝光面积 (%)',
    defaultValue: 50,
    validator: getNumberValidator(30, 100),
  },
  exposureRequireInteraction: {
    displayName: '首次交互后开始曝光',
    defaultValue: true,
  },
  maxWidth: {
    displayName: '最大宽度 (px)',
    defaultValue: 1440,
    validator: getNumberValidator(1000, 3000),
  },
  horizontalWheelScroll: {
    displayName: '启用横向滚动',
    defaultValue: false,
  },
})

export const getAggregatedHomeOptions = () =>
  getComponentSettings<OptionsOfMetadata<typeof aggregatedHomeOptionsMetadata>>('aggregatedHome')
    .options

/** 通知首页布局变化, 避免依赖设置 Proxy 的深层响应. */
export const sectionsChangedEvent = new EventTarget()

export const setSectionsSettings = (sections: SectionsSettings) => {
  getAggregatedHomeOptions().sections = sections
  sectionsChangedEvent.dispatchEvent(new Event('change'))
}
