import {
  ReadDisplayOption,
  ReadModeOption,
  type AggregatedVideoCard,
  type SectionData,
} from '../types'

export interface ViewContext {
  mode: ReadModeOption
  display: ReadDisplayOption
  showRead: boolean
  isRead: (key: string) => boolean
  /** 固定卡片即使已读也保留在视图中 (仍保持淡化). */
  isPinned: (key: string) => boolean
}

/** 从本轮候选就地计算可见卡片, 不发请求. */
export const computeView = (data: SectionData, context: ViewContext): AggregatedVideoCard[] => {
  if (context.mode === ReadModeOption.Off) {
    return data.candidates
  }
  if (context.showRead || context.display === ReadDisplayOption.DimOnly) {
    return data.candidates
  }
  if (context.display === ReadDisplayOption.HideImmediately) {
    // 已读但固定的卡片保留; 其余已读立即移除.
    return data.candidates.filter(
      card => !context.isRead(card.readKey) || context.isPinned(card.readKey),
    )
  }
  // DimThenHide: 加载时已读且现在仍已读的隐藏; 固定卡片例外保留.
  return data.candidates.filter(
    card =>
      !data.readAtLoad.has(card.readKey) ||
      !context.isRead(card.readKey) ||
      context.isPinned(card.readKey),
  )
}
