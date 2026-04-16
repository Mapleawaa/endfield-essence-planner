const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const weaponsSource = read("js/app.weapons.js");
const recommendationsSource = read("js/app.recommendations.js");
const recommendationDisplaySource = read("js/app.recommendations.display.js");

const extractConstArrow = (source, name) => {
  const pattern = new RegExp(
    `const\\s+${name}\\s*=\\s*\\(([^)]*)\\)\\s*=>\\s*\\{([\\s\\S]*?)\\n\\s*\\};`
  );
  const match = source.match(pattern);
  assert.ok(match, `${name} should exist`);
  return {
    args: match[1],
    body: match[2],
  };
};

const sanitizeDefinition = extractConstArrow(weaponsSource, "sanitizeRegionSelection");
const normalizeDefinition = extractConstArrow(weaponsSource, "normalizeRegionSelection");

const sanitizeRegionSelection = new Function(
  sanitizeDefinition.args,
  `${sanitizeDefinition.body}`
);
const normalizeRegionSelection = new Function(
  "sanitizeRegionSelection",
  `return function(${normalizeDefinition.args}) {${normalizeDefinition.body}};`
)(sanitizeRegionSelection);

assert.deepEqual(
  normalizeRegionSelection(["区域A", "区域B"], ["区域A", "区域B"], ["区域A", "区域B", "区域C"]),
  [],
  "region filter should collapse to neutral state when current selection already covers every available region"
);

assert.deepEqual(
  normalizeRegionSelection(["区域C"], ["区域A", "区域B"], ["区域A", "区域B", "区域C"]),
  [],
  "region filter should discard unreachable unavailable-only selections instead of keeping a blank result state"
);

assert.deepEqual(
  normalizeRegionSelection(["区域A", "区域C"], ["区域A", "区域B"], ["区域A", "区域B", "区域C"]),
  ["区域A"],
  "region filter should preserve only meaningful available-region selections in option order"
);

assert.deepEqual(
  normalizeRegionSelection(["区域A"], [], ["区域A", "区域B", "区域C"]),
  [],
  "effective region selection should stay neutral when no regions are currently available"
);

assert.match(
  weaponsSource,
  /if\s*\(!available\.includes\(region\)\)\s*return false;/,
  "isRegionSelected should not mark unavailable regions as active"
);

assert.match(
  weaponsSource,
  /const\s+available\s*=\s*getAvailableRegions\(\);[\s\S]*?state\.selectedRegions\.value\s*=\s*!next\.length\s*\|\|\s*next\.length\s*===\s*available\.length\s*\?\s*\[\]\s*:\s*next;/,
  "toggleRegionFilter should use available regions as the interaction universe and collapse full coverage back to []"
);

assert.match(
  recommendationsSource,
  /const\s+selectedRegions\s*=\s*getEffectiveSelectedRegions\(\);/,
  "recommendationEmptyReason should derive from effectiveSelectedRegions instead of raw persisted selectedRegions"
);

assert.doesNotMatch(
  recommendationsSource,
  /state\.availableRegions\s*=\s*availableRegions/,
  "availableRegions should update the existing ref value instead of replacing the ref object after initWeapons has already subscribed"
);

assert.match(
  recommendationDisplaySource,
  /const\s+selected\s*=\s*getEffectiveSelectedRegions\(\);/,
  "recommendation display filtering should derive from effectiveSelectedRegions instead of raw persisted selectedRegions"
);

assert.match(
  recommendationDisplaySource,
  /const\s+selectedRegions\s*=\s*getEffectiveSelectedRegions\(\);/,
  "coverageSummary should classify region-filter coverage gaps from effectiveSelectedRegions"
);

assert.doesNotMatch(
  weaponsSource,
  /state\.effectiveSelectedRegions\s*=\s*effectiveSelectedRegions/,
  "effectiveSelectedRegions should keep the stable state ref and write through value updates instead of replacing the ref object"
);

console.log("task3-region-filter-normalization: ok");
