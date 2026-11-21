import { getAggregatedHomeOptions } from './options'

/** 水位变化事件, 供 ExtraOptions 重置后通知首页. */
export const watermarkChangedEvent = new EventTarget()

/** 动态板块的启用时间点水位; 首次生效时写入当前时间. */
export const getFeedsCutoffAt = (): number | null =>
  (getAggregatedHomeOptions().feedsCutoffAt as number | null) ?? null

export const setFeedsCutoffAt = (value: number | null, notify = true) => {
  getAggregatedHomeOptions().feedsCutoffAt = value
  if (notify) {
    watermarkChangedEvent.dispatchEvent(new Event('change'))
  }
}

export const ensureFeedsCutoffAt = (): number => {
  const current = getFeedsCutoffAt()
  if (current != null) {
    return current
  }
  const now = Date.now()
  getAggregatedHomeOptions().feedsCutoffAt = now
  return now
}
