import { applyContentFilter } from '@/components/feeds/api'
import type { VideoCard } from '@/components/feeds/video-card'
import { formatCount, formatDuration } from '@/core/utils/formatters'
import type { PopularPage } from '../types'
import { requestJson } from './http'
import { toAggregatedCard, toHttps } from './mapping'

const ENDPOINT = 'x/web-interface/popular'

interface RawPopularItem {
  aid: number
  bvid: string
  title: string
  pic: string
  desc?: string
  duration: number
  pubdate: number
  owner: {
    mid: number
    name: string
    face: string
  }
  stat: {
    view: number
    danmaku: number
    like: number
  }
}

interface PopularData {
  list?: RawPopularItem[]
  no_more?: boolean
}

const mapPopularItem = (item: RawPopularItem): VideoCard => {
  const timestamp = item.pubdate * 1000
  return {
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
    playCount: formatCount(item.stat.view),
    danmakuCount: formatCount(item.stat.danmaku),
    like: formatCount(item.stat.like),
  }
}

/** 综合热门单页; `cards=[]` 是合法成功, 非零 code/网络错误抛 BilibiliApiError. */
export const getPopularPage = async (pn: number): Promise<PopularPage> => {
  const url = `https://api.bilibili.com/x/web-interface/popular?ps=20&pn=${pn}`
  const data = await requestJson<PopularData>(url, ENDPOINT)
  const rawItems = data.list ?? []
  const seen = new Set<string>()
  const cards = applyContentFilter(rawItems.map(mapPopularItem))
    .map(card => toAggregatedCard(card, 'popular'))
    .filter(card => {
      if (seen.has(card.readKey)) {
        return false
      }
      seen.add(card.readKey)
      return true
    })
  return {
    cards,
    noMore: data.no_more ?? rawItems.length === 0,
  }
}
