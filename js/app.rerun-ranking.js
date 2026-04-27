(function () {
  const modules = (window.AppModules = window.AppModules || {});
  const DAY_MS = 24 * 60 * 60 * 1000;
  const compareTextSafe = (a, b) => {
    if (typeof compareText === "function") return compareText(a, b);
    return String(a || "").localeCompare(String(b || ""), "zh-Hans-CN");
  };

  const resolveNowMs = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (value instanceof Date && Number.isFinite(value.getTime())) return value.getTime();
    if (typeof value === "string" && value.trim()) {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return Date.now();
  };

  const pickLastEndedWindow = (windows, nowMs) => {
    if (!Array.isArray(windows)) return null;
    let candidate = null;
    windows.forEach((item) => {
      const endMs = Number(item && item.endMs);
      if (!Number.isFinite(endMs) || endMs > nowMs) return;
      if (!candidate || endMs > candidate.endMs) {
        candidate = item;
      }
    });
    return candidate;
  };

  const pickNextUpcomingWindow = (windows, nowMs) => {
    if (!Array.isArray(windows)) return null;
    let candidate = null;
    windows.forEach((item) => {
      const startMs = Number(item && item.startMs);
      if (!Number.isFinite(startMs) || startMs <= nowMs) return;
      if (!candidate || startMs < candidate.startMs) {
        candidate = item;
      }
    });
    return candidate;
  };

  const countStartedWindows = (windows, nowMs) => {
    if (!Array.isArray(windows)) return 0;
    let count = 0;
    windows.forEach((item) => {
      const startMs = Number(item && item.startMs);
      if (!Number.isFinite(startMs) || startMs > nowMs) return;
      count += 1;
    });
    return count;
  };

  const toCharacterName = (record) => {
    if (!record || typeof record !== "object") return "";
    if (record.characterName) return String(record.characterName);
    if (record.primaryCharacter) return String(record.primaryCharacter);
    if (Array.isArray(record.characters)) {
      const first = record.characters.find(Boolean);
      if (first) return String(first);
    }
    return "";
  };
  const resolveWeaponNames = (record, fallbackKey) => {
    if (!record || typeof record !== "object") {
      return fallbackKey ? [String(fallbackKey)] : [];
    }
    if (Array.isArray(record.weaponNames) && record.weaponNames.length) {
      return Array.from(new Set(record.weaponNames.map((item) => String(item || "").trim()).filter(Boolean)));
    }
    if (record.primaryWeaponName) return [String(record.primaryWeaponName)];
    if (record.weaponName) return [String(record.weaponName)];
    return fallbackKey ? [String(fallbackKey)] : [];
  };

  const deriveRerunRankingRows = (scheduleByCharacter, options) => {
    const source = scheduleByCharacter && typeof scheduleByCharacter === "object" ? scheduleByCharacter : {};
    const nowMs = resolveNowMs(options && options.nowMs);
    const activeByWeapon =
      options && options.activeByWeapon && typeof options.activeByWeapon === "object"
        ? options.activeByWeapon
        : {};
    const rows = [];

    Object.keys(source).forEach((scheduleKey) => {
      const record = source[scheduleKey];
      if (!record || typeof record !== "object") return;
      const characterName = toCharacterName(record);
      if (!characterName) return;
      const weaponNames = resolveWeaponNames(record, scheduleKey);
      const weaponLabel = String(
        record.primaryWeaponName ||
          record.weaponName ||
          weaponNames[0] ||
          scheduleKey
      );
      const isActive = weaponNames.some((name) => Boolean(activeByWeapon[name]));
      const lastWindow = pickLastEndedWindow(record.windows, nowMs);
      const nextWindow = pickNextUpcomingWindow(record.windows, nowMs);
      const lastEndMs = lastWindow ? Number(lastWindow.endMs) : Number.NaN;
      const nextStartMs = nextWindow ? Number(nextWindow.startMs) : Number.NaN;
      const hasEndedHistory = Number.isFinite(lastEndMs);
      const hasUpcomingWindow = Number.isFinite(nextStartMs);
      if (!hasEndedHistory && !isActive && !hasUpcomingWindow) return;
      const gapMs = hasEndedHistory ? nowMs - lastEndMs : null;
      if (hasEndedHistory && (!Number.isFinite(gapMs) || gapMs < 0)) return;

      rows.push({
        weaponName: weaponLabel,
        characterName,
        avatarSrc: String(record.avatarSrc || ""),
        hasEndedHistory,
        lastEndMs: hasEndedHistory ? lastEndMs : null,
        nextStartMs: hasUpcomingWindow ? nextStartMs : null,
        gapMs,
        gapDays: hasEndedHistory ? Math.floor(gapMs / DAY_MS) : null,
        rerunCount: countStartedWindows(record.windows, nowMs),
        isActive,
        isUpcoming: !isActive && hasUpcomingWindow && !hasEndedHistory,
      });
    });

    const compareRankingRow = (a, b) => {
      const gapA = Number.isFinite(a.gapMs) ? a.gapMs : -1;
      const gapB = Number.isFinite(b.gapMs) ? b.gapMs : -1;
      if (gapB !== gapA) return gapB - gapA;

      const lastEndA = Number.isFinite(a.lastEndMs) ? a.lastEndMs : Number.POSITIVE_INFINITY;
      const lastEndB = Number.isFinite(b.lastEndMs) ? b.lastEndMs : Number.POSITIVE_INFINITY;
      if (lastEndA !== lastEndB) return lastEndA - lastEndB;

      const characterDiff = compareTextSafe(a.characterName, b.characterName);
      if (characterDiff !== 0) return characterDiff;
      return compareTextSafe(a.weaponName, b.weaponName);
    };

    rows.sort(compareRankingRow);

    const dedupedByCharacter = new Map();
    rows.forEach((row) => {
      const key = String(row.characterName || "");
      if (!key) return;
      if (!dedupedByCharacter.has(key)) {
        dedupedByCharacter.set(key, row);
        return;
      }
      const existing = dedupedByCharacter.get(key);
      if (row.isActive !== existing.isActive) {
        dedupedByCharacter.set(key, row.isActive ? row : existing);
        return;
      }
      if (row.isUpcoming !== existing.isUpcoming) {
        dedupedByCharacter.set(key, row.isUpcoming ? row : existing);
        return;
      }
      if (compareRankingRow(row, existing) < 0) {
        dedupedByCharacter.set(key, row);
      }
    });
    const deduped = Array.from(dedupedByCharacter.values()).sort(compareRankingRow);

    const maxGapDays = deduped.reduce((max, row) => {
      if (!row.hasEndedHistory || !Number.isFinite(row.gapDays)) return max;
      return Math.max(max, row.gapDays);
    }, 0);
    deduped.forEach((row) => {
      if (!row.hasEndedHistory || !Number.isFinite(row.gapDays) || maxGapDays <= 0) {
        row.gapRatio = 0;
        return;
      }
      row.gapRatio = Math.min(row.gapDays / maxGapDays, 1);
    });

    const inactive = [];
    const active = [];
    const upcoming = [];
    deduped.forEach((row) => {
      if (row.isUpcoming) {
        upcoming.push(row);
        return;
      }
      if (row.isActive) {
        active.push(row);
      } else {
        inactive.push(row);
      }
    });

    return inactive.concat(active, upcoming);
  };

  modules.deriveRerunRankingRows = deriveRerunRankingRows;

  // ---- Timeline (Gantt) data ----

  var deriveRerunTimelineData = function (scheduleByCharacter, options) {
    var source = scheduleByCharacter && typeof scheduleByCharacter === "object" ? scheduleByCharacter : {};
    var nowMs = resolveNowMs(options && options.nowMs);
    var pxPerDay = (options && typeof options.pxPerDay === "number" && options.pxPerDay > 0) ? options.pxPerDay : 5;

    var characters = [];
    var gMin = Infinity;
    var gMax = -Infinity;

    Object.keys(source).forEach(function (name) {
      var record = source[name];
      if (!record || typeof record !== "object") return;
      var characterName = toCharacterName(record);
      if (!characterName) return;
      if (!Array.isArray(record.windows) || !record.windows.length) return;

      var wins = [];
      record.windows.forEach(function (w) {
        var s = Number(w && w.startMs);
        var e = Number(w && w.endMs);
        if (!Number.isFinite(s) || !Number.isFinite(e)) return;
        wins.push({ startMs: s, endMs: e, version: String(w.version || "") });
        if (s < gMin) gMin = s;
        if (e > gMax) gMax = e;
      });
      if (!wins.length) return;
      wins.sort(function (a, b) { return a.startMs - b.startMs; });

      characters.push({
        name: characterName,
        avatarSrc: String(record.avatarSrc || ""),
        wins: wins
      });
    });

    if (!characters.length) return null;

    // Sort by first window start
    characters.sort(function (a, b) { return a.wins[0].startMs - b.wins[0].startMs; });

    // Timeline range: 1st of first window's month -> 1st of 2 months after last window
    var rStart = new Date(gMin); rStart.setDate(1); rStart.setHours(0, 0, 0, 0);
    var rEnd = new Date(gMax); rEnd.setMonth(rEnd.getMonth() + 2); rEnd.setDate(1); rEnd.setHours(0, 0, 0, 0);
    var rStartMs = rStart.getTime();
    var rEndMs = rEnd.getTime();
    var totalDays = Math.ceil((rEndMs - rStartMs) / DAY_MS);

    // Month columns
    var months = [];
    var cur = new Date(rStart);
    while (cur < rEnd) {
      var nxt = new Date(cur); nxt.setMonth(nxt.getMonth() + 1);
      var mEnd = Math.min(nxt.getTime(), rEndMs);
      var days = Math.ceil((mEnd - cur.getTime()) / DAY_MS);
      months.push({
        label: cur.getFullYear() + "年" + (cur.getMonth() + 1) + "月",
        wPx: Math.round(days * pxPerDay)
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    var canvasW = Math.round(totalDays * pxPerDay);
    var showToday = nowMs >= rStartMs && nowMs <= rEndMs;
    var todayPx = showToday ? ((nowMs - rStartMs) / DAY_MS) * pxPerDay : null;

    // Build character rows with positioned window bars
    var fmtFull = function (ms) {
      var d = new Date(ms);
      return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
    };
    var fmtShort = function (ms) {
      var d = new Date(ms);
      return (d.getMonth() + 1) + "/" + d.getDate();
    };
    var charRows = characters.map(function (ch) {
      var hasActive = false;
      var bars = ch.wins.map(function (w) {
        var leftPx = ((w.startMs - rStartMs) / DAY_MS) * pxPerDay;
        var widthPx = Math.max(((w.endMs - w.startMs) / DAY_MS) * pxPerDay, 4);
        var isActive = nowMs >= w.startMs && nowMs <= w.endMs;
        var isPast = nowMs > w.endMs;
        var isUpcoming = nowMs < w.startMs;
        if (isActive) hasActive = true;
        var cls = isActive ? "active" : (isPast ? "past" : "upcoming");
        var statusText = isActive ? "正在进行" : (isPast ? "已结束" : "即将到来");
        var fullLabel = fmtFull(w.startMs) + " – " + fmtFull(w.endMs);
        var shortLabel = fmtShort(w.startMs) + "–" + fmtShort(w.endMs);
        var durationDays = Math.ceil((w.endMs - w.startMs) / DAY_MS);
        var versionLabel = w.version || "";
        // Always use short label (no year) for consistency. Tiny bars (< 40px): empty.
        var showLabel = widthPx >= 40 ? shortLabel : "";
        return {
          leftPx: leftPx,
          widthPx: widthPx,
          cls: cls,
          dateLabel: showLabel,
          fullLabel: fullLabel,
          charName: ch.name,
          statusText: statusText,
          durationDays: durationDays,
          versionLabel: versionLabel,
          startMs: w.startMs,
          endMs: w.endMs
        };
      });
      return { name: ch.name, avatarSrc: ch.avatarSrc, bars: bars, hasActive: hasActive };
    });

    return {
      charRows: charRows,
      months: months,
      canvasW: canvasW,
      rStartMs: rStartMs,
      rEndMs: rEndMs,
      totalDays: totalDays,
      pxPerDay: pxPerDay,
      todayPx: todayPx,
      showToday: showToday,
      nowMs: nowMs
    };
  };
  modules.deriveRerunTimelineData = deriveRerunTimelineData;

  modules.initRerunRanking = function initRerunRanking(ctx, state, options) {
    var ref = ctx.ref, watch = ctx.watch, computed = ctx.computed;
    var resolveValue = function (value, fallback) {
      return value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, "value")
        ? value
        : ref(fallback);
    };

    state.rerunRankingRows = resolveValue(state.rerunRankingRows, []);
    state.hasRerunRankingRows = resolveValue(state.hasRerunRankingRows, false);
    state.rerunRankingGeneratedAt = resolveValue(state.rerunRankingGeneratedAt, 0);

    // Timeline state
    state.rerunTimelineZoom = resolveValue(state.rerunTimelineZoom, 5);
    state.rerunTimelineShowPreviewAxis = resolveValue(state.rerunTimelineShowPreviewAxis, true);
    state.rerunTimelineFullOverview = resolveValue(state.rerunTimelineFullOverview, false);
    state.rerunTimelineData = resolveValue(state.rerunTimelineData, null);
    state.rerunTimelinePreviewPx = ref(null);
    state.rerunTimelinePreviewDate = ref("");

    var computeTimeline = function (source, nowMs, pxPerDay) {
      var data = deriveRerunTimelineData(source, { nowMs: nowMs, pxPerDay: pxPerDay });
      state.rerunTimelineData.value = data;
      return data;
    };

    state.refreshRerunRanking = function (nextNow) {
      var source = (
        (state.characterUpByCharacter && state.characterUpByCharacter.value) ||
        (state.upScheduleNormalized &&
          state.upScheduleNormalized.value &&
          state.upScheduleNormalized.value.byCharacter) ||
        (state.weaponUpByWeapon && state.weaponUpByWeapon.value) ||
        {}
      );
      var scheduleNowMs =
        state.upScheduleNowMs && typeof state.upScheduleNowMs.value !== "undefined"
          ? Number(state.upScheduleNowMs.value)
          : Number.NaN;
      var fallbackNow =
        Number.isFinite(scheduleNowMs) && scheduleNowMs > 0
          ? scheduleNowMs
          : options && Object.prototype.hasOwnProperty.call(options, "nowMs")
          ? options.nowMs
          : undefined;
      var nowMs = resolveNowMs(typeof nextNow === "undefined" ? fallbackNow : nextNow);
      var activeByWeapon =
        typeof state.getWeaponUpWindowAt === "function" ? state.getWeaponUpWindowAt(nowMs) : {};
      var rows = deriveRerunRankingRows(source, { nowMs: nowMs, activeByWeapon: activeByWeapon });
      state.rerunRankingRows.value = rows;
      state.hasRerunRankingRows.value = rows.length > 0;
      state.rerunRankingGeneratedAt.value = nowMs;

      // Compute timeline data
      var pxPerDay = Number(state.rerunTimelineZoom.value) || 5;
      computeTimeline(source, nowMs, pxPerDay);
      return rows;
    };

    // Zoom methods
    state.rerunTimelineSetZoom = function (value) {
      var z = Number(value);
      if (!Number.isFinite(z) || z < 1.5) z = 1.5;
      if (z > 15) z = 15;
      state.rerunTimelineZoom.value = z;
      state.rerunTimelineFullOverview.value = false;
      state.refreshRerunRanking();
    };

    state.rerunTimelineToggleFullOverview = function () {
      var data = state.rerunTimelineData.value;
      if (!data) return;
      state.rerunTimelineFullOverview.value = !state.rerunTimelineFullOverview.value;
      if (state.rerunTimelineFullOverview.value) {
        // Compute zoom that fits all data in viewport (estimate ~800px available for desktop)
        var availW = typeof window !== "undefined" && window.innerWidth ? Math.max(window.innerWidth - 220, 400) : 800;
        var fitZoom = availW / data.totalDays;
        state.rerunTimelineZoom.value = Math.max(1.5, Math.min(15, Math.round(fitZoom * 10) / 10));
      } else {
        state.rerunTimelineZoom.value = 5;
      }
      state.refreshRerunRanking();
    };

    state.rerunTimelineTogglePreviewAxis = function () {
      state.rerunTimelineShowPreviewAxis.value = !state.rerunTimelineShowPreviewAxis.value;
    };

    // Tooltip state
    state.rerunTimelineTooltip = ref(null);

    // Preview axis + tooltip: mousemove handler
    state.rerunTimelineOnTimelineMove = function (event) {
      // Find the right scrollable panel (exclude left character column)
      var rightPanel = event.currentTarget.querySelector(".rerun-timeline-right");
      if (!rightPanel) return;
      var rightRect = rightPanel.getBoundingClientRect();
      var xInRight = event.clientX - rightRect.left + rightPanel.scrollLeft;
      var isOverRight = event.clientX >= rightRect.left;

      // Preview axis (only when mouse is over the right panel)
      if (state.rerunTimelineShowPreviewAxis.value && isOverRight && xInRight >= 0) {
        state.rerunTimelinePreviewPx.value = xInRight;
        var data = state.rerunTimelineData.value;
        if (data) {
          var dayOffset = xInRight / data.pxPerDay;
          var ms = data.rStartMs + dayOffset * DAY_MS;
          state.rerunTimelinePreviewDate.value = new Date(ms).toLocaleDateString(
            (typeof window !== "undefined" && window.locale) || undefined
          );
        }
      } else {
        state.rerunTimelinePreviewPx.value = null;
      }

      // Tooltip: check if hovering over a bar
      var barEl = event.target.closest(".rerun-timeline-bar");
      if (barEl) {
        var tip = {
          charName: barEl.getAttribute("data-char-name") || "",
          fullLabel: barEl.getAttribute("data-full-label") || "",
          statusText: barEl.getAttribute("data-status-text") || "",
          durationDays: barEl.getAttribute("data-duration-days") || "",
          versionLabel: barEl.getAttribute("data-version-label") || "",
          x: event.clientX,
          y: event.clientY
        };
        state.rerunTimelineTooltip.value = tip;
      } else {
        state.rerunTimelineTooltip.value = null;
      }
    };

    state.rerunTimelineOnTimelineLeave = function () {
      state.rerunTimelinePreviewPx.value = null;
      state.rerunTimelineTooltip.value = null;
    };

    if (typeof watch === "function" && state.upScheduleNowMs && typeof state.upScheduleNowMs === "object") {
      watch(
        function () { return Number(state.upScheduleNowMs.value || 0); },
        function (nextNow) {
          state.refreshRerunRanking(nextNow);
        },
        { immediate: true }
      );
    } else {
      state.refreshRerunRanking();
    }
  };
})();
