import type { RawWatchlaterItem } from '@/components/video/watchlater'
import { getUID } from '@/core/utils'
import type { WatchlaterResult } from '../types'
import { BilibiliApiError, requestJson } from './http'

const ENDPOINT = 'x/v2/history/toview/web'

interface WatchlaterData {
  list?: RawWatchlaterItem[]
}

/**
 * 稍后再看本地 raw GET.
 * 成功空返回 `{ ok: true, items: [] }`; 非零 code/网络/解析失败返回 `{ ok: false }`.
 * 不使用会吞错的 `getWatchlaterList`.
 */
export const fetchWatchlater = async (): Promise<WatchlaterResult> => {
  if (!getUID()) {
    return { ok: false, error: new BilibiliApiError(-101, '未登录', ENDPOINT) }
  }
  try {
    const data = await requestJson<WatchlaterData>(
      'https://api.bilibili.com/x/v2/history/toview/web',
      ENDPOINT,
    )
    return { ok: true, items: data.list ?? [] }
  } catch (error) {
    if (error instanceof BilibiliApiError) {
      return { ok: false, error }
    }
    return { ok: false, error: new BilibiliApiError(-1, String(error), ENDPOINT) }
  }
}
