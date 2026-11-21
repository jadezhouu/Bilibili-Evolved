import type { ReadEntry, ReadStoreData } from './types'

const STORAGE_PREFIX = 'be:aggregatedHome:read:v1:'
const MAX_ENTRIES = 5000
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000
const WRITE_DELAY_MS = 500

type ReadSection = ReadEntry['s']
type ReadReason = ReadEntry['r']

const getDefaultStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch (error) {
    console.warn('[aggregatedHome] localStorage 不可用, 已读将只保存在内存中', error)
    return null
  }
}

/** 按 UID 隔离的本地已读 store; 写盘防抖, 90 天/5000 条清理. */
export class AggregatedReadStore {
  private entries = new Map<string, ReadEntry>()
  private uid = ''
  private initialized = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()

  constructor(
    private readonly storage: Storage | null = getDefaultStorage(),
    private readonly now: () => number = Date.now,
  ) {}

  get storageKey(): string {
    return STORAGE_PREFIX + (this.uid || 'anonymous')
  }

  init(uid: string) {
    this.uid = uid
    this.initialized = true
    this.entries.clear()
    this.load()
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  mark(key: string, section: ReadSection, reason: ReadReason) {
    if (this.entries.has(key)) {
      return
    }
    this.entries.set(key, { t: this.now(), s: section, r: reason })
    this.prune()
    this.scheduleFlush()
    this.notify()
  }

  unmark(key: string) {
    if (!this.entries.delete(key)) {
      return
    }
    this.scheduleFlush()
    this.notify()
  }

  clear() {
    this.entries.clear()
    this.cancelFlush()
    try {
      this.storage?.removeItem(this.storageKey)
    } catch (error) {
      console.warn('[aggregatedHome] 清空已读失败', error)
    }
    this.notify()
  }

  count(): number {
    return this.entries.size
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  flush() {
    this.cancelFlush()
    if (!this.storage || !this.initialized) {
      return
    }
    const data: ReadStoreData = {
      version: 1,
      uid: this.uid,
      updatedAt: this.now(),
      entries: Object.fromEntries(this.entries),
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('[aggregatedHome] 写入已读失败', error)
    }
  }

  private load() {
    if (!this.storage || !this.initialized) {
      return
    }
    try {
      const raw = this.storage.getItem(this.storageKey)
      if (!raw) {
        return
      }
      const data = JSON.parse(raw) as ReadStoreData
      if (data.version !== 1 || !data.entries) {
        return
      }
      Object.entries(data.entries).forEach(([key, entry]) => {
        if (entry && typeof entry.t === 'number') {
          this.entries.set(key, entry)
        }
      })
      this.prune()
    } catch (error) {
      console.warn('[aggregatedHome] 读取已读失败, 已降级为内存模式', error)
    }
  }

  private prune() {
    const cutoff = this.now() - RETENTION_MS
    this.entries.forEach((entry, key) => {
      if (entry.t < cutoff) {
        this.entries.delete(key)
      }
    })
    if (this.entries.size <= MAX_ENTRIES) {
      return
    }
    const sorted = [...this.entries.entries()].sort((a, b) => b[1].t - a[1].t)
    this.entries = new Map(sorted.slice(0, MAX_ENTRIES))
  }

  private scheduleFlush() {
    if (this.timer != null) {
      return
    }
    this.timer = setTimeout(() => {
      this.timer = null
      this.flush()
    }, WRITE_DELAY_MS)
  }

  private cancelFlush() {
    if (this.timer != null) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

export const readStore = new AggregatedReadStore()
