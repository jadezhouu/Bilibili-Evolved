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
    return data.candidates.filter(card => !context.isRead(card.readKey))
  }
  // DimThenHide: 加载时已读且现在仍已读的隐藏; 会话内新标记只淡化.
  return data.candidates.filter(
    card => !data.readAtLoad.has(card.readKey) || !context.isRead(card.readKey),
  )
}
