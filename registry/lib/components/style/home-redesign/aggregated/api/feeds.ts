import {
  applyContentFilter,
  feedsCardTypes,
  getFeeds,
  groupVideoFeeds,
} from '@/components/feeds/api'
import type { VideoCard } from '@/components/feeds/video-card'
import { getUID } from '@/core/utils'
import { formatCount, formatDuration, parseCount, parseDuration } from '@/core/utils/formatters'
import type { DynamicFeedPage, RawDynamicItem } from '../types'
import { BilibiliApiError, assertCode } from './http'
import { toAggregatedCard, toHttps } from './mapping'

const ENDPOINT = 'x/polymer/web-dynamic/v1/feed/all'

interface DynamicFeedData {
  items?: RawDynamicItem[]
  has_more?: boolean
  offset?: string | number
}

const mapDynamicItemToVideoCard = (item: RawDynamicItem): VideoCard => {
  const archive = item.modules.module_dynamic.major?.archive
  const author = item.modules.module_author
  const stat = item.modules.module_stat
  const timestamp = author.pub_ts * 1000
  const duration = parseDuration(archive?.duration_text ?? '')
  return {
    id: item.id_str,
    aid: archive ? Number(archive.aid) : undefined,
    bvid: archive?.bvid,
    title: archive?.title ?? '',
    coverUrl: toHttps(archive?.cover) ?? '',
    upName: author.name,
    upID: author.mid,
    upFaceUrl: toHttps(author.face),
    description: archive?.desc ?? '',
    dynamic: item.modules.module_dynamic.desc?.text ?? '',
    duration,
    durationText: formatDuration(duration),
    playCount: formatCount(parseCount(archive?.stat?.play ?? 0)),
    danmakuCount: formatCount(parseCount(archive?.stat?.danmaku ?? 0)),
    like: formatCount(stat?.like?.count ?? 0),
    timestamp,
    time: new Date(timestamp),
  }
}

/** 动态原始页; 分页/水位只用 rawItems/nextCursor/hasMore, cards 只用于展示. */
export const fetchDynamicPage = async (cursor?: string): Promise<DynamicFeedPage> => {
  if (!getUID()) {
    throw new BilibiliApiError(-101, '未登录', ENDPOINT)
  }
  const json = await getFeeds(feedsCardTypes.video, cursor)
  assertCode(json, ENDPOINT)
  const data = (json.data ?? {}) as DynamicFeedData
  const rawItems = data.items ?? []
  const usableItems = rawItems.filter(item => item.modules?.module_dynamic?.major?.archive != null)
  const cards = applyContentFilter(groupVideoFeeds(usableItems.map(mapDynamicItemToVideoCard))).map(
    card => toAggregatedCard(card, 'feeds'),
  )
  const nextCursor =
    data.offset != null ? String(data.offset) : rawItems[rawItems.length - 1]?.id_str ?? null
  return {
    rawItems,
    cards,
    nextCursor,
    hasMore: data.has_more ?? rawItems.length > 0,
  }
}
