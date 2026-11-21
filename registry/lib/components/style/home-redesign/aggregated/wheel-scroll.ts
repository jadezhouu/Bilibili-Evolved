/**
 * Shift + 滚轮横向滚动列表.
 * 普通滚轮保持页面纵向滚动; 触控板横向手势交给浏览器原生处理.
 */
export const enableShiftHorizontalWheel = (element: HTMLElement) => {
  const handler = (event: WheelEvent) => {
    if (event.deltaX || !event.deltaY || event.ctrlKey) {
      return
    }
    if (!event.shiftKey) {
      // 横向滚动容器会吞掉纵向滚轮, 这里显式把页面滚回去.
      const root = document.scrollingElement ?? document.documentElement
      const maxScrollTop = root.scrollHeight - root.clientHeight
      const next = root.scrollTop + event.deltaY
      if (next < 0 || next > maxScrollTop) {
        return
      }
      event.preventDefault()
      window.scrollBy(0, event.deltaY)
      return
    }
    const maxScrollLeft = element.scrollWidth - element.clientWidth
    if (maxScrollLeft <= 0) {
      return
    }
    const next = element.scrollLeft + event.deltaY
    if (next < 0 || next > maxScrollLeft) {
      return
    }
    event.preventDefault()
    element.scrollBy(event.deltaY, 0)
  }
  element.addEventListener('wheel', handler, { passive: false })
  const previousSnap = element.style.scrollSnapType
  element.style.scrollSnapType = 'none'
  return () => {
    element.removeEventListener('wheel', handler)
    element.style.scrollSnapType = previousSnap
  }
}
