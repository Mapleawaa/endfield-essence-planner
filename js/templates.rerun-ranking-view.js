(function () {
  window.__APP_TEMPLATES = window.__APP_TEMPLATES || {};
  window.__APP_TEMPLATES.rerunRankingView = `
<section class="panel rerun-ranking-panel">
  <div class="panel-title rerun-ranking-title-row">
    <h2>{{ t("nav.rerun_ranking") }}</h2>
    <div class="rerun-ranking-controls">
      <label class="rerun-ranking-ctrl" :title="t('rerun.timeline_zoom_title')">
        <span class="rerun-ranking-ctrl-label">{{ t("rerun.timeline_zoom") }}</span>
        <input
          type="range"
          class="rerun-ranking-zoom-slider"
          :min="1.5"
          :max="15"
          :step="0.5"
          :value="rerunTimelineZoom"
          @input="rerunTimelineSetZoom($event.target.value)"
        />
        <span class="rerun-ranking-zoom-val">{{ rerunTimelineZoom.toFixed(1) }}x</span>
      </label>
      <button
        class="ghost-button rerun-ranking-ctrl-btn"
        :class="{ 'is-active': rerunTimelineFullOverview }"
        @click="rerunTimelineToggleFullOverview"
        :title="t('rerun.timeline_overview_title')"
      >{{ t("rerun.timeline_overview") }}</button>
      <button
        class="ghost-button rerun-ranking-ctrl-btn"
        :class="{ 'is-active': rerunTimelineShowPreviewAxis }"
        @click="rerunTimelineTogglePreviewAxis"
        :title="t('rerun.timeline_preview_axis_title')"
      >{{ t("rerun.timeline_preview_axis") }}</button>
    </div>
  </div>
  <div v-if="!hasRerunRankingRows" class="rerun-ranking-empty">
    {{ t("rerun.no_rerun_ranking_data") }}
  </div>
  <div v-else class="rerun-timeline-legend">
    <span class="rerun-timeline-legend-item"><span class="rerun-timeline-legend-dot past"></span>{{ t("rerun.timeline_status_past") }}</span>
    <span class="rerun-timeline-legend-item"><span class="rerun-timeline-legend-dot active"></span>{{ t("rerun.timeline_status_active") }}</span>
    <span class="rerun-timeline-legend-item"><span class="rerun-timeline-legend-dot upcoming"></span>{{ t("rerun.timeline_status_upcoming") }}</span>
  </div>
  <div v-if="hasRerunRankingRows && rerunTimelineData" class="rerun-timeline-body" @mousemove="rerunTimelineOnTimelineMove" @mouseleave="rerunTimelineOnTimelineLeave">
    <div class="rerun-timeline-left">
      <div class="rerun-timeline-left-header">{{ t("rerun.timeline_character_header") }}</div>
      <div
        v-for="ch in rerunTimelineData.charRows"
        :key="ch.name"
        class="rerun-timeline-left-row"
      >
        <img
          v-if="ch.avatarSrc"
          class="rerun-timeline-avatar"
          v-lazy-src="ch.avatarSrc"
          :alt="tTerm('character', ch.name)"
          loading="lazy"
          decoding="async"
          @error="handleCharacterImageError"
        />
        <div v-else class="rerun-timeline-avatar-fallback">{{ tTerm("character", ch.name).slice(0, 1) }}</div>
        <span class="rerun-timeline-char-name">{{ tTerm("character", ch.name) }}</span>
        <span
          v-if="ch.statusBadge"
          class="rerun-timeline-status-card"
          :class="'rerun-timeline-status-card--' + ch.statusBadge.type"
        >{{ ch.statusBadge.text }}</span>
      </div>
    </div>
    <div class="rerun-timeline-right" ref="rerunTimelineRight">
      <div class="rerun-timeline-canvas" :style="{ width: rerunTimelineData.canvasW + 'px' }">
        <div class="rerun-timeline-header">
          <div
            v-for="m in rerunTimelineData.months"
            :key="m.label"
            class="rerun-timeline-month"
            :style="{ width: m.wPx + 'px' }"
          >{{ m.label }}</div>
        </div>
        <div class="rerun-timeline-rows-shell">
          <div
            v-for="ch in rerunTimelineData.charRows"
            :key="ch.name"
            class="rerun-timeline-row"
          >
            <div
              v-for="m in rerunTimelineData.months"
              :key="m.label"
              class="rerun-timeline-month-bg"
              :style="{ width: m.wPx + 'px' }"
            ></div>
            <div
              v-for="bar in ch.bars"
              :key="bar.startMs + '-' + bar.endMs + '-' + bar.versionLabel"
              class="rerun-timeline-bar"
              :class="bar.cls"
              :style="{ left: bar.leftPx + 'px', width: bar.widthPx + 'px' }"
              :data-char-name="bar.charName"
              :data-char-label="bar.charLabel"
              :data-full-label="bar.fullLabel"
              :data-status-text="bar.statusText"
              :data-duration-days="bar.durationDays"
              :data-version-label="bar.versionLabel"
            >{{ bar.dateLabel }}</div>
          </div>
          <div
            v-if="rerunTimelineData.showToday"
            class="rerun-timeline-today"
            :style="{ left: rerunTimelineData.todayPx + 'px', height: rerunTimelineRowsHeight + 'px' }"
          ><span class="rerun-timeline-today-label">{{ t("rerun.timeline_today") }}</span></div>
          <div
            v-if="rerunTimelineShowPreviewAxis && rerunTimelinePreviewPx !== null"
            class="rerun-timeline-preview-axis"
            :style="{ left: rerunTimelinePreviewPx + 'px', height: rerunTimelineRowsHeight + 'px' }"
          ><span class="rerun-timeline-preview-label">{{ rerunTimelinePreviewDate }}</span></div>
        </div>
      </div>
    </div>
  </div>
  <div
    v-if="rerunTimelineTooltip"
    class="rerun-timeline-tooltip"
    :style="{ left: rerunTimelineTooltip.x + 14 + 'px', top: rerunTimelineTooltip.y - 52 + 'px' }"
  >
    <div class="rerun-timeline-tooltip-name">{{ rerunTimelineTooltip.charLabel || rerunTimelineTooltip.charName }}</div>
    <div class="rerun-timeline-tooltip-meta">{{ rerunTimelineTooltip.statusText }} · {{ rerunTimelineTooltip.fullLabel }}</div>
    <div class="rerun-timeline-tooltip-meta" v-if="rerunTimelineTooltip.versionLabel">{{ rerunTimelineTooltip.versionLabel }}</div>
    <div class="rerun-timeline-tooltip-meta">{{ t("rerun.timeline_duration_days", { days: rerunTimelineTooltip.durationDays }) }}</div>
  </div>
</section>`;
})();
