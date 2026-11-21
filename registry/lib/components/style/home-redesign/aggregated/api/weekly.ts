import { applyContentFilter } from '@/components/feeds/api'
import type { VideoCard } from '@/components/feeds/video-card'
import { formatCount, formatDuration } from '@/core/utils/formatters'
import type { WeeklyIssue, WeeklyIssueSummary } from '../types'
import { BilibiliApiError, requestJson } from './http'
import { toAggregatedCard, toHttps } from './mapping'

const LIST_ENDPOINT = 'x/web-interface/popular/series/list'
const ISSUE_ENDPOINT = 'x/web-interface/popular/series/one'
const LIST_CACHE_TTL = 30 * 60 * 1000

interface RawWeeklySummary {
  number: number
  subject: string
  name: string
}

interface WeeklyListData {
  list?: RawWeeklySummary[]
}

interface RawWeeklyItem {
  aid: number
  bvid: string
  title: string
  pic: string
  desc?: string
  duration: number
  pubdate?: number
  owner?: {
    mid: number
    name: string
    face: string
  }
  stat?: {
    view: number
    danmaku: number
    like: number
  }
}

interface RawWeeklyConfig {
  number: number
  name: string
  subject: string
  label: string
}

interface WeeklyIssueData {
  config?: RawWeeklyConfig
  list?: RawWeeklyItem[]
}

let listCache: { at: number; items: WeeklyIssueSummary[] } | null = null
const issueCache = new Map<number, WeeklyIssue>()

const mapWeeklyItem = (item: RawWeeklyItem): VideoCard => {
  const timestamp = item.pubdate != null ? item.pubdate * 1000 : undefined
  return {
    id: item.bvid || `av${item.aid}`,
    aid: item.aid,
    bvid: item.bvid,
    title: item.title,
    coverUrl: toHttps(item.pic) ?? '',
    upName: item.owner?.name ?? '',
    upID: item.owner?.mid,
    upFaceUrl: toHttps(item.owner?.face),
    description: item.desc ?? '',
    duration: item.duration,
    durationText: formatDuration(item.duration),
    timestamp,
    time: timestamp != null ? new Date(timestamp) : undefined,
    playCount: formatCount(item.stat?.view ?? 0),
    danmakuCount: formatCount(item.stat?.danmaku ?? 0),
    like: formatCount(item.stat?.like ?? 0),
  }
}

/** 每周必看期数列表; 成功结果缓存 30 分钟, force 绕过缓存. */
export const fetchWeeklyList = async (force = false): Promise<WeeklyIssueSummary[]> => {
  if (!force && listCache && Date.now() - listCache.at < LIST_CACHE_TTL) {
    return listCache.items
  }
  const data = await requestJson<WeeklyListData>(
    'https://api.bilibili.com/x/web-interface/popular/series/list',
    LIST_ENDPOINT,
  )
  const items = (data.list ?? []).map(
    (item): WeeklyIssueSummary => ({
      number: item.number,
      subject: item.subject,
      name: item.name,
      year: Number(item.name.slice(0, 4)) || 0,
    }),
  )
  listCache = { at: Date.now(), items }
  return items
}

/** 单期每周必看; 会话内缓存, force 绕过并覆盖缓存. 失败不写缓存. */
export const fetchWeeklyIssue = async (number: number, force = false): Promise<WeeklyIssue> => {
  if (!force) {
    const cached = issueCache.get(number)
    if (cached) {
      return cached
    }
  }
  const data = await requestJson<WeeklyIssueData>(
    `https://api.bilibili.com/x/web-interface/popular/series/one?number=${number}`,
    ISSUE_ENDPOINT,
  )
  const { config } = data
  if (!config) {
    throw new BilibiliApiError(-404, `每周必看第 ${number} 期缺少 config`, ISSUE_ENDPOINT)
  }
  const seen = new Set<string>()
  const cards = applyContentFilter((data.list ?? []).map(mapWeeklyItem))
    .map(card => toAggregatedCard(card, 'weekly'))
    .filter(card => {
      if (seen.has(card.readKey)) {
        return false
      }
      seen.add(card.readKey)
      return true
    })
  const issue: WeeklyIssue = {
    number: config.number,
    name: config.name,
    subject: config.subject,
    label: config.label,
    cards,
  }
  issueCache.set(number, issue)
  return issue
}
