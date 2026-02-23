(function () {
  window.__APP_TEMPLATES = Object.assign({}, window.__APP_TEMPLATES, {
    planConfigControl: `
<div class="plan-config" @click.stop>
        <button
          class="ghost-button toggle-button"
          :class="{ 'is-active': showPlanConfig }"
          :aria-pressed="showPlanConfig ? 'true' : 'false'"
          @click="$emit('toggle')"
        >
          <span
            v-if="showPlanConfigHintDot"
            class="plan-config-hint-dot"
            aria-hidden="true"
          ></span>
          <span>{{ t("方案推荐设置") }}</span>
        </button>
        <div v-if="showPlanConfig" class="plan-config-panel">
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("方案显示") }}</div>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideExcluded }"
              :title="t('开启后，排除的武器将不会出现在方案推荐列表中。')"
              role="switch"
              :aria-checked="recommendationConfig.hideExcluded ? 'true' : 'false'"
              @click="recommendationConfig.hideExcluded = !recommendationConfig.hideExcluded"
            >
              <span class="switch-label">{{ t("隐藏已排除武器") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideExcluded }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
            <button
              class="ghost-button toggle-button switch-toggle"
              :class="{ 'is-active': recommendationConfig.hideFourStarWeapons }"
              :title="t('开启后，四星武器将不会出现在武器选择器和方案推荐列表中。')"
              role="switch"
              :aria-checked="recommendationConfig.hideFourStarWeapons ? 'true' : 'false'"
              @click="recommendationConfig.hideFourStarWeapons = !recommendationConfig.hideFourStarWeapons"
            >
              <span class="switch-label">{{ t("隐藏四星武器") }}</span>
              <span class="switch-track" :class="{ on: recommendationConfig.hideFourStarWeapons }" aria-hidden="true">
                <span class="switch-thumb"></span>
              </span>
            </button>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("地区优先级") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion1">
              <option value="">{{ t("不设置") }}</option>
              <option v-for="region in regionOptions" :key="'region-1-' + region" :value="region">
                {{ region }}
              </option>
            </select>
            <div class="secondary-hint">{{ t("优先地区1（最高）") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.preferredRegion2">
              <option value="">{{ t("不设置") }}</option>
              <option
                v-for="region in regionOptions"
                :key="'region-2-' + region"
                :value="region"
                :disabled="region === recommendationConfig.preferredRegion1"
              >
                {{ region }}
              </option>
            </select>
            <div class="secondary-hint">{{ t("优先地区2（次高）") }}</div>
          </div>
          <div class="plan-config-item">
            <div class="secondary-label">{{ t("优先级影响策略") }}</div>
            <select class="secondary-select" v-model="recommendationConfig.priorityMode">
              <option
                v-for="mode in tPlanPriorityModeOptions"
                :key="mode.value"
                :value="mode.value"
              >
                {{ mode.label }}
              </option>
            </select>
            <div class="priority-mode-guide">
              <div
                class="secondary-hint priority-mode-desc"
                :class="{ 'is-active': recommendationConfig.priorityMode === mode.value }"
                v-for="mode in tPlanPriorityModeOptions"
                :key="'mode-desc-' + mode.value"
              >
                <span class="priority-mode-name">{{ mode.label }}：</span>{{ mode.description }}
              </div>
            </div>
          </div>
        </div>
      </div>
`
  });
})();
