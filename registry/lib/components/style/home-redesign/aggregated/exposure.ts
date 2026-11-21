import { intersectionObserve } from '@/core/observer'

export interface ExposureTrackerOptions {
  threshold: number
  dwell: number
  requireInteraction: boolean
}

/**
 * 卡片曝光计时: 可见面积达到阈值并持续 dwell 后回调一次.
 * 页面隐藏/失焦/首次交互会暂停或恢复计时.
 */
export class ExposureTracker {
  private observer: IntersectionObserver
  private ratios = new Map<Element, number>()
  private timers = new Map<Element, number>()
  private interacted = false
  private destroyed = false

  constructor(
    private readonly options: ExposureTrackerOptions,
    private readonly onExpose: (element: HTMLElement) => void,
  ) {
    const [observer] = intersectionObserve([], { threshold: [0, options.threshold, 1] }, entries =>
      this.handleEntries(entries),
    )
    this.observer = observer
    if (!options.requireInteraction) {
      this.interacted = true
    } else {
      document.addEventListener('pointerdown', this.handleInteraction, { passive: true })
      document.addEventListener('keydown', this.handleInteraction)
      document.addEventListener('wheel', this.handleInteraction, { passive: true })
    }
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
    window.addEventListener('blur', this.handleBlur)
    window.addEventListener('focus', this.handleFocus)
  }

  observe(elements: HTMLElement[]) {
    this.observer.disconnect()
    this.clearTimers()
    this.ratios.clear()
    elements.forEach(element => this.observer.observe(element))
  }

  destroy() {
    if (this.destroyed) {
      return
    }
    this.destroyed = true
    this.observer.disconnect()
    this.clearTimers()
    this.ratios.clear()
    document.removeEventListener('pointerdown', this.handleInteraction)
    document.removeEventListener('keydown', this.handleInteraction)
    document.removeEventListener('wheel', this.handleInteraction)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    window.removeEventListener('blur', this.handleBlur)
    window.removeEventListener('focus', this.handleFocus)
  }

  private handleEntries(entries: IntersectionObserverEntry[]) {
    entries.forEach(entry => {
      this.ratios.set(entry.target, entry.intersectionRatio)
      this.evaluate(entry.target as HTMLElement)
    })
  }

  private evaluate(element: HTMLElement) {
    if (this.destroyed) {
      return
    }
    const visible =
      (this.ratios.get(element) ?? 0) >= this.options.threshold &&
      document.visibilityState === 'visible' &&
      document.hasFocus() &&
      (!this.options.requireInteraction || this.interacted)
    if (!visible) {
      this.clearTimer(element)
      return
    }
    if (this.timers.has(element)) {
      return
    }
    const timer = window.setTimeout(() => {
      this.timers.delete(element)
      this.observer.unobserve(element)
      this.onExpose(element)
    }, this.options.dwell)
    this.timers.set(element, timer)
  }

  private evaluateAll() {
    this.ratios.forEach((_, element) => this.evaluate(element as HTMLElement))
  }

  private clearTimer(element: Element) {
    const timer = this.timers.get(element)
    if (timer != null) {
      clearTimeout(timer)
      this.timers.delete(element)
    }
  }

  private clearTimers() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }

  private handleInteraction = () => {
    if (this.interacted) {
      return
    }
    this.interacted = true
    document.removeEventListener('pointerdown', this.handleInteraction)
    document.removeEventListener('keydown', this.handleInteraction)
    document.removeEventListener('wheel', this.handleInteraction)
    this.evaluateAll()
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      this.clearTimers()
    } else {
      this.evaluateAll()
    }
  }

  private handleBlur = () => {
    this.clearTimers()
  }

  private handleFocus = () => {
    this.evaluateAll()
  }
}
