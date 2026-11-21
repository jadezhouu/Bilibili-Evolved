import type { PinStoreData } from './types'

const STORAGE_PREFIX = 'be:aggregatedHome:pins:v1:'
const MAX_PINS = 1000

const getDefaultStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch (error) {
    console.warn('[aggregatedHome] localStorage 不可用, 固定将只保存在内存中', error)
    return null
  }
}

/** 按 UID 隔离的固定 store; 固定只阻止自动已读, 与已读记录解耦. */
export class AggregatedPinStore {
  private entries = new Map<string, number>()
  private uid = ''
  private initialized = false
  private listeners = new Set<() => void>()

  constructor(
    private readonly storage: Storage | null = getDefaultStorage(),
    private readonly now: () => number = Date.now,
  ) {}

  get storageKey(): string {
    return STORAGE_PREFIX + (this.uid || 'anonymous')
  }

  init(uid: string) {
    if (this.initialized && this.uid === uid) {
      return
    }
    this.uid = uid
    this.initialized = true
    this.entries.clear()
    this.load()
    this.notify()
  }

  has(key: string): boolean {
    return this.entries.has(key)
  }

  /** 切换固定状态并立即写盘, 返回切换后的状态. */
  toggle(key: string): boolean {
    if (!key) {
      return false
    }
    const pinned = !this.entries.has(key)
    if (pinned) {
      this.entries.set(key, this.now())
      this.prune()
    } else {
      this.entries.delete(key)
    }
    this.flush()
    this.notify()
    return pinned
  }

  unpin(key: string) {
    if (!this.entries.delete(key)) {
      return
    }
    this.flush()
    this.notify()
  }

  clear() {
    this.entries.clear()
    try {
      this.storage?.removeItem(this.storageKey)
    } catch (error) {
      console.warn('[aggregatedHome] 清空固定失败', error)
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
    if (!this.storage || !this.initialized) {
      return
    }
    const data: PinStoreData = {
      version: 1,
      uid: this.uid,
      updatedAt: this.now(),
      entries: Object.fromEntries(this.entries),
    }
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('[aggregatedHome] 写入固定失败', error)
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
      const data = JSON.parse(raw) as PinStoreData
      if (data.version !== 1 || !data.entries) {
        return
      }
      Object.entries(data.entries).forEach(([key, pinnedAt]) => {
        if (typeof pinnedAt === 'number' && Number.isFinite(pinnedAt)) {
          this.entries.set(key, pinnedAt)
        }
      })
      this.prune()
    } catch (error) {
      console.warn('[aggregatedHome] 读取固定失败, 已降级为内存模式', error)
    }
  }

  private prune() {
    if (this.entries.size <= MAX_PINS) {
      return
    }
    const sorted = [...this.entries.entries()].sort((a, b) => b[1] - a[1])
    this.entries = new Map(sorted.slice(0, MAX_PINS))
  }

  private notify() {
    this.listeners.forEach(listener => listener())
  }
}

export const pinStore = new AggregatedPinStore()
