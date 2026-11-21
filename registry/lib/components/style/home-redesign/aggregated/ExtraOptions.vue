<template>
  <div class="aggregated-extra-options">
    <div class="aggregated-extra-options-title">板块布局</div>
    <div class="aggregated-extra-options-tip">
      按住拖动可以调整顺序, 眼睛按钮切换显示; 隐藏的板块不会挂载或请求.
    </div>
    <div ref="sortList" class="aggregated-extra-options-list">
      <div
        v-for="(item, index) of sortedItems"
        :key="item.definition.id"
        :data-id="item.definition.id"
        class="aggregated-extra-options-item"
        :class="{ 'aggregated-extra-options-item-dimmed': item.settings.hidden }"
      >
        <VIcon icon="mdi-drag" :size="18" class="aggregated-extra-options-item-handle" />
        <div class="aggregated-extra-options-item-name">{{ item.definition.displayName }}</div>
        <div class="aggregated-extra-options-item-actions">
          <VButton
            type="transparent"
            icon
            title="上移"
            :disabled="index === 0"
            @click="move(index, -1)"
          >
            <VIcon icon="mdi-chevron-up" :size="16" />
          </VButton>
          <VButton
            type="transparent"
            icon
            title="下移"
            :disabled="index === sortedItems.length - 1"
            @click="move(index, 1)"
          >
            <VIcon icon="mdi-chevron-down" :size="16" />
          </VButton>
          <VButton
            type="transparent"
            icon
            :title="item.settings.hidden ? '显示板块' : '隐藏板块'"
            @click="toggleHidden(item.definition.id)"
          >
            <VIcon
              :icon="item.settings.hidden ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              :size="16"
            />
          </VButton>
        </div>
      </div>
    </div>
    <div class="aggregated-extra-options-actions">
      <VButton @click="restoreDefault">恢复默认顺序</VButton>
    </div>
    <div class="aggregated-extra-options-section">
      <div class="aggregated-extra-options-title">已读记录</div>
      <div class="aggregated-extra-options-tip">当前 {{ readCount }} 条, 按 UID 保存在本地.</div>
      <VButton :disabled="readCount === 0" @click="clearRead">清空已读</VButton>
    </div>
    <div class="aggregated-extra-options-section">
      <div class="aggregated-extra-options-title">动态时间点</div>
      <div class="aggregated-extra-options-tip">{{ cutoffText }}</div>
      <VButton @click="resetWatermark">重置为显示全部动态</VButton>
    </div>
  </div>
</template>
<script lang="ts">
import type { SortableEvent } from 'sortablejs'
import { SortableJSLibrary } from '@/core/runtime-library'
import { VButton, VIcon } from '@/ui'
import {
  createDefaultSections,
  getAggregatedHomeOptions,
  sectionDefinitions,
  setSectionsSettings,
  type SectionDefinition,
} from './options'
import { readStore } from './read-store'
import { getFeedsCutoffAt, setFeedsCutoffAt } from './watermarks'
import type { SectionId, SectionSettings } from './types'

interface SortItem {
  definition: SectionDefinition
  settings: SectionSettings
}

export default Vue.extend({
  components: {
    VButton,
    VIcon,
  },
  data() {
    return {
      sortedItems: [] as SortItem[],
      readCount: 0,
      readUnsubscribe: null as (() => void) | null,
    }
  },
  computed: {
    cutoffText(): string {
      const cutoff = getFeedsCutoffAt()
      if (cutoff == null) {
        return '未设置, 首次加载动态时写入当前时间.'
      }
      return new Date(cutoff).toLocaleString()
    },
  },
  mounted() {
    this.readCount = readStore.count()
    this.readUnsubscribe = readStore.subscribe(() => {
      this.readCount = readStore.count()
    })
    this.syncItems()
    this.setupSortable()
  },
  beforeDestroy() {
    this.readUnsubscribe?.()
  },
  methods: {
    syncItems() {
      const { sections } = getAggregatedHomeOptions()
      this.sortedItems = sectionDefinitions
        .map(
          (definition): SortItem => ({
            definition,
            settings: { ...sections[definition.id] },
          }),
        )
        .sort((a, b) => a.settings.order - b.settings.order)
    },
    async setupSortable() {
      const Sortable = await SortableJSLibrary
      Sortable.create(this.$refs.sortList as HTMLElement, {
        delay: 100,
        forceFallback: true,
        onEnd: (event: SortableEvent) => {
          const items = [...this.sortedItems]
          const [moved] = items.splice(event.oldIndex ?? 0, 1)
          items.splice(event.newIndex ?? 0, 0, moved)
          this.applyOrder(items)
        },
      })
    },
    applyOrder(items: SortItem[]) {
      const { sections } = getAggregatedHomeOptions()
      const next = { ...sections }
      items.forEach((item, index) => {
        const order = index + 1
        next[item.definition.id] = { ...next[item.definition.id], order }
        item.settings.order = order
      })
      setSectionsSettings(next)
      this.sortedItems = items
    },
    move(index: number, delta: number) {
      const target = index + delta
      if (target < 0 || target >= this.sortedItems.length) {
        return
      }
      const items = [...this.sortedItems]
      const [moved] = items.splice(index, 1)
      items.splice(target, 0, moved)
      this.applyOrder(items)
    },
    toggleHidden(id: SectionId) {
      const { sections } = getAggregatedHomeOptions()
      setSectionsSettings({
        ...sections,
        [id]: { ...sections[id], hidden: !sections[id].hidden },
      })
      this.syncItems()
    },
    restoreDefault() {
      setSectionsSettings(createDefaultSections())
      this.syncItems()
    },
    clearRead() {
      readStore.clear()
    },
    resetWatermark() {
      setFeedsCutoffAt(0)
    },
  },
})
</script>
<style lang="scss">
@import 'common';

.aggregated-extra-options {
  @include v-stretch(10px);
  padding: 4px 0;

  &-title {
    @include semi-bold();
    font-size: 14px;
  }

  &-tip {
    opacity: 0.6;
  }

  &-list {
    @include v-stretch(6px);
  }

  &-item {
    @include h-center(8px);
    @include border-card();
    @include shadow();
    padding: 6px 8px;
    cursor: move;
    transition: border-color 0.2s ease-out;

    &:hover {
      border-color: var(--theme-color);
    }

    &-dimmed {
      opacity: 0.5;
    }

    &-handle {
      opacity: 0.6;
    }

    &-name {
      flex: 1;
    }

    &-actions {
      @include h-center(2px);
    }
  }

  &-actions {
    @include h-center();
    justify-content: flex-end;
  }

  &-section {
    @include v-stretch(4px);
    margin-top: 4px;
  }
}
</style>
