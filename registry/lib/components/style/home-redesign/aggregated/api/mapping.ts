import type { VideoCard } from '@/components/feeds/video-card'
import type { AggregatedVideoCard, SectionId } from '../types'

/** 已读主键: bvid 优先, 其次 av+aid, 最后回退到卡片 id. */
export const getReadKey = (card: Pick<VideoCard, 'id' | 'aid' | 'bvid'>): string =>
  card.bvid || (card.aid != null ? `av${card.aid}` : card.id)

/** 统一把封面/头像的 http 换成 https. */
export const toHttps = (url?: string) => url?.replace(/^http:/, 'https:')

/** 给卡片补上来源板块与已读主键. */
export const toAggregatedCard = (card: VideoCard, source: SectionId): AggregatedVideoCard => ({
  ...card,
  source,
  readKey: getReadKey(card),
})
