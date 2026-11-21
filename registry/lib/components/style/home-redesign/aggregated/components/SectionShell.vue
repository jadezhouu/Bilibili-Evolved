<template>
  <section class="aggregated-section">
    <header class="aggregated-section-header">
      <div class="aggregated-section-heading">
        <div class="aggregated-section-title">{{ title }}</div>
        <div v-if="subtitle" class="aggregated-section-subtitle">{{ subtitle }}</div>
      </div>
      <div class="aggregated-section-controls">
        <slot name="controls" />
      </div>
    </header>
    <div class="aggregated-section-body">
      <slot />
    </div>
  </section>
</template>
<script lang="ts">
export default Vue.extend({
  props: {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      default: '',
    },
  },
})
</script>
<style lang="scss">
@import 'common';

.aggregated-section {
  margin-bottom: 24px;

  &-header {
    @include h-center();
    align-items: flex-start;
    justify-content: space-between;
    min-height: 40px;
    margin-bottom: 4px;
  }

  &-heading {
    @include h-center(12px);
    min-width: 0;
  }

  &-title {
    @include semi-bold();
    color: var(--home-color);
    font-size: 20px;
    line-height: 28px;
  }

  &-subtitle {
    color: #888;
    font-size: 12px;
    line-height: 28px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &-controls {
    @include h-center(8px);
    flex-shrink: 0;
  }

  &-body {
    width: 100%;
  }
}

.aggregated-section-empty,
.aggregated-section-error,
.aggregated-inline-error {
  @include h-center(12px);
  padding: 24px;
  color: #888;
}

.aggregated-section-error,
.aggregated-inline-error {
  color: #e55;
}

.aggregated-inline-error {
  padding: 8px 4px;
  font-size: 12px;
}
</style>
