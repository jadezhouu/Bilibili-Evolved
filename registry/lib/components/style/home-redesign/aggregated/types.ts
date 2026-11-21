import type { VideoCard } from '@/components/feeds/video-card'
import type { RawWatchlaterItem } from '@/components/video/watchlater'
import type { BilibiliApiError } from './api/http'

/** 四个聚合板块的稳定标识. */
export type SectionId = 'feeds' | 'popular' | 'weekly' | 'watchlater'

/** 单个板块的排序/显隐设置. */
export interface SectionSettings {
  order: number
  hidden: boolean
}

/** 四个板块的布局设置. */
export type SectionsSettings = Record<SectionId, SectionSettings>

/** 单个板块的加载状态, 供根组件渲染空态/错误态. */
export type SectionLoadState = 'idle' | 'loading' | 'ready' | 'error'

/** 动态/热门/每周各自的已读触发方式. */
export enum ReadModeOption {
  Off = '关闭',
  Click = '点击视频后',
  Exposure = '曝光后',
}

/** 已读卡片在当前会话内的展示方式. */
export enum ReadDisplayOption {
  DimThenHide = '淡化，下次加载消失',
  HideImmediately = '立即移除',
  DimOnly = '只淡化',
}

/** 统一后的卡片, 带上来源板块与已读主键. */
export interface AggregatedVideoCard extends VideoCard {
  source: SectionId
  readKey: string
}

/** 动态水位, 随组件隐藏选项持久化. */
export interface WatermarkState {
  feedsCutoffAt: number | null
}

/** 动态原始项: 分页/水位只使用这里的字段, 不使用映射后的卡片. */
export interface RawDynamicItem {
  id_str: string
  modules: {
    module_author: { pub_ts: number; mid: number; name: string; face: string }
    module_dynamic: {
      major?: {
        archive?: {
          aid: number | string
          bvid: string
          title: string
          cover: string
          desc?: string
          duration_text?: string
          stat?: { play?: number | string; danmaku?: number | string }
        }
      }
      desc?: { text?: string }
    }
    module_stat?: { like?: { count?: number } }
  }
}

/** 动态原始页. `cards` 只用于展示, 不能用于判断分页/页结束/水位. */
export interface DynamicFeedPage {
  rawItems: RawDynamicItem[]
  cards: AggregatedVideoCard[]
  nextCursor: string | null
  hasMore: boolean
}

/** 热门单页结果. `cards=[]` 是合法成功. */
export interface PopularPage {
  cards: AggregatedVideoCard[]
  noMore: boolean
}

/** 单期每周必看. `cards=[]` 是合法成功. */
export interface WeeklyIssue {
  number: number
  name: string
  subject: string
  label: string
  cards: AggregatedVideoCard[]
}

/** 每周必看期数列表项. */
export interface WeeklyIssueSummary {
  number: number
  subject: string
  name: string
  year: number
}

/** 一个板块本轮加载到的候选与并发标记. */
export interface SectionData {
  /** 本轮请求到的全部可展示卡片 (含已读). */
  candidates: AggregatedVideoCard[]
  /** 加载时已读的 readKey. */
  readAtLoad: Set<string>
  /** 加载发起时的板块 epoch, 用于丢弃旧响应. */
  epoch: number
}

/** 稍后再看结果: 成功空与请求失败必须可区分. */
export type WatchlaterResult =
  | { ok: true; items: RawWatchlaterItem[] }
  | { ok: false; error: BilibiliApiError }

/** 已读条目. */
export interface ReadEntry {
  t: number
  s: 'feeds' | 'popular' | 'weekly'
  r: 'click' | 'exposure'
}

/** 已读本地存储结构. */
export interface ReadStoreData {
  version: 1
  uid: string
  updatedAt: number
  entries: Record<string, ReadEntry>
}
