const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const templateFile = path.join(root, "js/templates.main.03.js");
const rerunTemplateFile = path.join(root, "js/templates.rerun-ranking-view.js");
const styleFile = path.join(root, "css/styles.layout.css");
const localeFiles = [
  path.join(root, "data/i18n/zh-CN.js"),
  path.join(root, "data/i18n/zh-TW.js"),
  path.join(root, "data/i18n/en.js"),
  path.join(root, "data/i18n/ja.js"),
];

assert.equal(fs.existsSync(templateFile), true, "js/templates.main.03.js should exist");
assert.equal(fs.existsSync(rerunTemplateFile), true, "js/templates.rerun-ranking-view.js should exist");
assert.equal(fs.existsSync(styleFile), true, "css/styles.layout.css should exist");
localeFiles.forEach((file) => {
  assert.equal(fs.existsSync(file), true, `${path.relative(root, file)} should exist`);
});

const templateSource = fs.readFileSync(templateFile, "utf8");
const rerunTemplateSource = fs.readFileSync(rerunTemplateFile, "utf8");
const styleSource = fs.readFileSync(styleFile, "utf8");
const localeSources = localeFiles.map((file) => ({
  file,
  source: fs.readFileSync(file, "utf8"),
}));

const rerunViewMatch = templateSource.match(
  /<div v-else-if="currentView === 'rerun-ranking'"[\s\S]*?<\/div>\s*<div v-else-if="currentView === 'match'"/
);
assert.ok(rerunViewMatch, "templates.main.03.js should include standalone rerun-ranking view before match view");
const rerunViewBlock = rerunViewMatch[0];

assert.match(
  rerunViewBlock,
  /<rerun-ranking-view\b/,
  "main template should delegate rerun-ranking view to extracted component"
);
assert.match(
  rerunViewBlock,
  /:rerun-timeline-data="rerunTimelineData"/,
  "rerun-ranking component should receive timeline data"
);
assert.match(
  rerunViewBlock,
  /:rerun-timeline-rows-height="rerunTimelineRowsHeight"/,
  "rerun-ranking component should receive dynamic row height"
);

assert.match(
  rerunTemplateSource,
  /v-for="ch in rerunTimelineData\.charRows"/,
  "rerun-ranking timeline should render character timeline rows"
);
assert.match(
  rerunTemplateSource,
  /v-for="bar in ch\.bars"/,
  "rerun-ranking timeline should render schedule bars"
);
assert.match(
  rerunTemplateSource,
  /tTerm\("character", ch\.name\)/,
  "rerun-ranking timeline should localize character labels"
);
assert.match(
  rerunTemplateSource,
  /:data-char-label="bar\.charLabel"/,
  "rerun-ranking tooltip dataset should include localized character label"
);
assert.match(
  rerunTemplateSource,
  /t\("rerun\.timeline_status_active"\)/,
  "rerun-ranking legend should use i18n for active status"
);
assert.match(
  rerunTemplateSource,
  /t\("rerun\.timeline_duration_days"/,
  "rerun-ranking tooltip duration should use i18n"
);
assert.match(
  rerunTemplateSource,
  /rerunTimelineRowsHeight \+ 'px'/,
  "timeline axis height should use measured row height"
);
assert.match(
  rerunTemplateSource,
  /v-if="!hasRerunRankingRows"/,
  "rerun-ranking view should provide explicit empty state"
);
assert.match(
  rerunTemplateSource,
  /class="rerun-timeline-status-card"/,
  "rerun-ranking status badge should render the timeline status card"
);
assert.match(
  rerunTemplateSource,
  /ch\.statusBadge\.text/,
  "rerun-ranking status badge should render derived localized status text"
);

assert.match(styleSource, /\.rerun-ranking-view\b/, "layout css should include rerun-ranking view container styles");
assert.match(styleSource, /\.rerun-timeline-body\b/, "layout css should include rerun timeline body styles");
assert.match(styleSource, /\.rerun-timeline-bar\b/, "layout css should include rerun timeline bar styles");
assert.match(styleSource, /\.rerun-ranking-empty\b/, "layout css should include rerun-ranking empty state styles");
assert.match(
  styleSource,
  /--rerun-timeline-row-height:\s*52px;/,
  "rerun timeline should define desktop row height through CSS variable"
);
assert.match(
  styleSource,
  /--rerun-timeline-row-height:\s*46px;/,
  "rerun timeline should define mobile row height through CSS variable"
);

const requiredI18nKeys = [
  "rerun.timeline_zoom",
  "rerun.timeline_overview",
  "rerun.timeline_preview_axis",
  "rerun.timeline_status_past",
  "rerun.timeline_status_active",
  "rerun.timeline_status_upcoming",
  "rerun.timeline_duration_days",
  "rerun.timeline_badge_active",
  "rerun.timeline_badge_upcoming",
  "rerun.timeline_badge_out",
];

localeSources.forEach(({ file, source }) => {
  requiredI18nKeys.forEach((key) => {
    assert.match(
      source,
      new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      `${path.relative(root, file)} should define i18n key ${key}`
    );
  });
});

console.log("task2-rerun-view-render: ok");
