(function () {
  var root = document.documentElement;
  var themeStorageKey = "planner-theme-mode:v1";
  var runSerial = 0;
  var cssFiles = [
    "./css/styles.theme.css",
    "./css/styles.layout.css",
    "./css/styles.overlays.css",
    "./css/styles.filters.css",
    "./css/styles.weapons.css",
    "./css/styles.recommendations.css",
    "./css/styles.theme.modes.css",
  ];
  var startupScripts = [
    "./vendor/vue.global.prod.js",
    "./data/dungeons.js",
    "./data/weapons.js",
    "./data/weapon-images.js",
    "./data/i18n.zh-CN.js",
    "./js/app.script-chain.js",
    "./js/app.js",
  ];

  var normalizeResourceKey = function (src) {
    try {
      return new URL(src, window.location.href).href;
    } catch (error) {
      return String(src || "");
    }
  };

  var applyPreloadTheme = function () {
    var themePreference = "auto";
    try {
      var savedTheme = localStorage.getItem(themeStorageKey);
      if (savedTheme === "auto" || savedTheme === "light" || savedTheme === "dark") {
        themePreference = savedTheme;
      }
    } catch (error) {
      // ignore localStorage errors
    }
    var resolvedTheme =
      themePreference === "auto"
        ? window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : themePreference;
    root.setAttribute("data-theme", resolvedTheme);
    root.style.colorScheme = resolvedTheme;
    if (themePreference === "auto" && window.matchMedia) {
      var preloadMediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      var onPreloadThemeChange = function (event) {
        if (!root.classList.contains("preload")) return;
        root.setAttribute("data-theme", event.matches ? "light" : "dark");
        root.style.colorScheme = event.matches ? "light" : "dark";
      };
      if (typeof preloadMediaTheme.addEventListener === "function") {
        preloadMediaTheme.addEventListener("change", onPreloadThemeChange);
      } else if (typeof preloadMediaTheme.addListener === "function") {
        preloadMediaTheme.addListener(onPreloadThemeChange);
      }
    }
  };

  var ensureShell = function () {
    if (!document.body) return false;
    var preload = document.getElementById("app-preload");
    if (!preload) {
      preload = document.createElement("div");
      preload.id = "app-preload";
      preload.innerHTML =
        '<div class="preload-card">' +
        '<div class="preload-title">少女祈祷中</div>' +
        '<div class="preload-sub preload-note">首次打开或强制刷新可能稍慢</div>' +
        '<div class="preload-status" aria-live="polite">正在准备资源…</div>' +
        '<div class="preload-current" aria-live="polite"></div>' +
        '<div class="preload-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">' +
        '<span class="preload-progress-fill" aria-valuenow="0"></span>' +
        "</div>" +
        '<div class="preload-count" aria-live="polite">0/0</div>' +
        "</div>";
      document.body.insertBefore(preload, document.body.firstChild || null);
    }
    var app = document.getElementById("app");
    if (!app) {
      app = document.createElement("div");
      app.id = "app";
      app.className = "app-shell";
      app.setAttribute("v-cloak", "");
      app.setAttribute("v-show", "appReady");
      app.setAttribute("data-fingerprint", "cmty-ep-2026-02-07");
      document.body.appendChild(app);
    }
    return true;
  };

  var getPreloadRefs = function () {
    var overlay = document.getElementById("app-preload");
    return {
      overlay: overlay,
      status: overlay ? overlay.querySelector(".preload-status") : null,
      current: overlay ? overlay.querySelector(".preload-current") : null,
      count: overlay ? overlay.querySelector(".preload-count") : null,
      progressFill: overlay ? overlay.querySelector(".preload-progress-fill") : null,
    };
  };

  var ensureErrorRenderer = function () {
    if (typeof window.__renderBootError === "function") return;
    window.__renderBootError = function renderBootError(payload) {
      var title = String((payload && payload.title) || "页面加载失败");
      var summary = String((payload && payload.summary) || "出现未知错误，请稍后重试。");
      var details = Array.isArray(payload && payload.details)
        ? payload.details.filter(Boolean).map(String)
        : [];
      var suggestions = Array.isArray(payload && payload.suggestions)
        ? payload.suggestions.filter(Boolean).map(String)
        : [];

      var page = document.createElement("div");
      page.style.cssText =
        "min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b0f14;color:#e6e9ef;font-family:'Microsoft YaHei UI','PingFang SC',sans-serif;";
      var card = document.createElement("div");
      card.style.cssText =
        "width:min(680px,92vw);border:1px solid rgba(243,108,108,0.42);border-radius:14px;padding:18px 18px 16px;background:rgba(26,14,18,0.84);box-shadow:0 14px 34px rgba(0,0,0,0.38);";

      var titleEl = document.createElement("div");
      titleEl.style.cssText = "font-size:16px;font-weight:700;letter-spacing:0.03em;color:#ff9e9e;";
      titleEl.textContent = title;
      card.appendChild(titleEl);

      var summaryEl = document.createElement("div");
      summaryEl.style.cssText = "margin-top:8px;line-height:1.7;color:#ffd7d7;";
      summaryEl.textContent = summary;
      card.appendChild(summaryEl);

      if (details.length) {
        var detailWrap = document.createElement("div");
        detailWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);";
        var detailTitle = document.createElement("div");
        detailTitle.style.cssText = "font-weight:600;color:#ffd1d1;";
        detailTitle.textContent = "错误详情";
        detailWrap.appendChild(detailTitle);
        var detailUl = document.createElement("ul");
        detailUl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        details.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          detailUl.appendChild(li);
        });
        detailWrap.appendChild(detailUl);
        card.appendChild(detailWrap);
      }

      if (suggestions.length) {
        var suggestWrap = document.createElement("div");
        suggestWrap.style.cssText =
          "margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);";
        var suggestTitle = document.createElement("div");
        suggestTitle.style.cssText = "font-weight:600;color:#f2e5c9;";
        suggestTitle.textContent = "建议处理";
        suggestWrap.appendChild(suggestTitle);
        var suggestOl = document.createElement("ol");
        suggestOl.style.cssText = "margin:8px 0 0 18px;padding:0;line-height:1.65;";
        suggestions.forEach(function (item) {
          var li = document.createElement("li");
          li.textContent = item;
          suggestOl.appendChild(li);
        });
        suggestWrap.appendChild(suggestOl);
        card.appendChild(suggestWrap);
      }

      var actionRow = document.createElement("div");
      actionRow.style.cssText = "margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;";

      var retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#c9fff7;";
      retryButton.textContent = "重试加载";
      retryButton.addEventListener("click", function () {
        if (typeof window.__startBootstrapEntry === "function") {
          window.__startBootstrapEntry({ fromRetry: true });
          return;
        }
        window.location.reload();
      });
      actionRow.appendChild(retryButton);

      var refreshButton = document.createElement("button");
      refreshButton.type = "button";
      refreshButton.style.cssText =
        "cursor:pointer;border:1px solid rgba(255,255,255,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.9);color:#fff;";
      refreshButton.textContent = "刷新页面";
      refreshButton.addEventListener("click", function () {
        window.location.reload();
      });
      actionRow.appendChild(refreshButton);

      var feedbackLink = document.createElement("a");
      feedbackLink.href = "https://github.com/cmyyx/endfield-essence-planner/issues";
      feedbackLink.target = "_blank";
      feedbackLink.rel = "noreferrer";
      feedbackLink.style.cssText =
        "display:inline-flex;align-items:center;text-decoration:none;border:1px solid rgba(77,214,201,0.45);border-radius:999px;padding:6px 14px;background:rgba(12,18,28,0.85);color:#c9fff7;";
      feedbackLink.textContent = "反馈问题";
      actionRow.appendChild(feedbackLink);

      card.appendChild(actionRow);
      page.appendChild(card);
      document.body.textContent = "";
      document.body.appendChild(page);
    };
  };

  var ensureLoadErrorReporter = function () {
    if (typeof window.__reportScriptChainMissing !== "function") {
      window.__reportScriptChainMissing = function reportScriptChainMissing() {
        window.__renderBootError({
          title: "页面资源加载失败",
          summary: "脚本加载清单缺失，应用暂时无法启动。",
          details: [
            "缺失资源清单：window.__APP_SCRIPT_CHAIN",
            "请确认 ./js/app.script-chain.js 已成功部署且可访问",
          ],
          suggestions: ["点击“重试加载”重新请求关键资源", "按 Ctrl + F5 强制刷新后重试"],
        });
      };
    }
    if (typeof window.__reportScriptLoadFailure !== "function") {
      window.__reportScriptLoadFailure = function reportScriptLoadFailure(failedScript) {
        var failed = String(failedScript || "").trim();
        window.__renderBootError({
          title: "页面资源加载失败",
          summary: "核心脚本未能完整加载，应用暂时无法启动。",
          details: [
            failed ? "失败资源：" + failed : "失败资源：未知",
            "网络状态：" + (navigator.onLine ? "在线" : "离线"),
            "可能原因：网络波动、缓存损坏、CDN 同步延迟或拦截插件阻止脚本请求",
          ],
          suggestions: [
            "点击“重试加载”重新请求关键资源",
            "按 Ctrl + F5 强制刷新后重试",
            "若问题持续，请在 GitHub Issues 附上控制台报错截图",
          ],
        });
      };
    }
  };

  var startBootstrap = function (options) {
    options = options || {};
    if (options.fromRetry && document.body) {
      document.body.textContent = "";
    }
    runSerial += 1;
    var runId = runSerial;
    window.__bootstrapEntryRunning = true;
    var declaredAppScriptChain =
      Array.isArray(window.__APP_SCRIPT_CHAIN) && window.__APP_SCRIPT_CHAIN.length
        ? window.__APP_SCRIPT_CHAIN.slice()
        : [];
    root.classList.add("preload");
    applyPreloadTheme();
    ensureErrorRenderer();
    ensureLoadErrorReporter();

    var finish = function () {
      if (!root.classList.contains("preload")) return;
      root.classList.remove("preload");
      var overlay = document.getElementById("app-preload");
      if (overlay) {
        overlay.classList.add("preload-hide");
        setTimeout(function () {
          if (overlay && overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
        }, 240);
      }
    };
    window.__finishPreload = finish;

    if (!ensureShell() && document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          ensureShell();
        },
        { once: true }
      );
    }

    var toResourceLabel = function (src) {
      var value = String(src || "");
      if (!value) return "未知资源";
      if (/^https?:\/\//i.test(value)) return value;
      return value;
    };
    var resourceState = new Map();
    var ensureResource = function (src, kind) {
      var key = normalizeResourceKey(src);
      if (!resourceState.has(key)) {
        resourceState.set(key, {
          key: key,
          src: src,
          kind: kind || "resource",
          label: toResourceLabel(src),
          status: "pending",
        });
      }
      return key;
    };
    var renderProgress = function () {
      if (runId !== runSerial) return;
      var refs = getPreloadRefs();
      if (!refs.overlay) return;
      var entries = Array.from(resourceState.values());
      var total = entries.length;
      var loaded = entries.filter(function (entry) {
        return entry.status === "loaded";
      }).length;
      var failedItem = entries.find(function (entry) {
        return entry.status === "failed";
      });
      var loadingItem = entries.find(function (entry) {
        return entry.status === "loading";
      });
      if (refs.count) {
        refs.count.textContent = loaded + "/" + total;
      }
      if (refs.progressFill) {
        var percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
        refs.progressFill.style.width = percent + "%";
        refs.progressFill.setAttribute("aria-valuenow", String(percent));
      }
      if (refs.status) {
        if (failedItem) {
          refs.status.textContent = "资源加载失败";
        } else if (total === 0) {
          refs.status.textContent = "正在准备资源…";
        } else if (loaded >= total) {
          refs.status.textContent = "资源已就绪，正在初始化页面…";
        } else {
          refs.status.textContent = "正在加载资源…";
        }
      }
      if (refs.current) {
        if (failedItem) {
          refs.current.textContent = "失败项：" + failedItem.label;
        } else if (loadingItem) {
          refs.current.textContent = "当前：" + loadingItem.label;
        } else if (loaded >= total && total > 0) {
          refs.current.textContent = "等待应用挂载完成…";
        } else {
          refs.current.textContent = "";
        }
      }
    };
    var setResourceStatus = function (key, status) {
      var item = resourceState.get(key);
      if (!item) return;
      item.status = status;
      renderProgress();
    };

    cssFiles.forEach(function (href) {
      ensureResource(href, "style");
    });
    startupScripts.forEach(function (src) {
      ensureResource(src, "script");
    });
    declaredAppScriptChain.forEach(function (src) {
      ensureResource(src, "script");
    });
    renderProgress();

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          renderProgress();
        },
        { once: true }
      );
    }

    var scriptLoadRegistry = new Map();
    var loadScript = function (src) {
      var key = ensureResource(src, "script");
      if (scriptLoadRegistry.has(key)) {
        return scriptLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var existingLoaded = Array.from(document.scripts || []).some(function (script) {
          var s = script.getAttribute("src") || script.src || "";
          var same = normalizeResourceKey(s) === key;
          return same && script.dataset && script.dataset.loaded === "true";
        });
        if (existingLoaded) {
          setResourceStatus(key, "loaded");
          resolve();
          return;
        }
        var script = document.createElement("script");
        script.src = src;
        setResourceStatus(key, "loading");
        script.onload = function () {
          script.dataset.loaded = "true";
          setResourceStatus(key, "loaded");
          resolve();
        };
        script.onerror = function () {
          setResourceStatus(key, "failed");
          scriptLoadRegistry.delete(key);
          reject(new Error("Failed to load: " + src));
        };
        var target = document.body || document.head || document.documentElement;
        target.appendChild(script);
      });
      scriptLoadRegistry.set(key, task);
      return task;
    };
    window.__loadScript = loadScript;

    var styleLoadRegistry = new Map();
    var cssLoadTimeoutMs = 12000;
    var loadStyle = function (href) {
      var key = ensureResource(href, "style");
      if (styleLoadRegistry.has(key)) {
        return styleLoadRegistry.get(key);
      }
      var task = new Promise(function (resolve, reject) {
        var settled = false;
        var link = document.querySelector('link[rel="stylesheet"][href="' + href + '"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
        }
        setResourceStatus(key, "loading");
        var cleanup = function () {
          clearTimeout(timeoutId);
          link.removeEventListener("load", onLoad);
          link.removeEventListener("error", onError);
        };
        var onLoad = function () {
          if (settled) return;
          settled = true;
          if (link.dataset) {
            link.dataset.loaded = "true";
          }
          cleanup();
          setResourceStatus(key, "loaded");
          resolve();
        };
        var onError = function () {
          if (settled) return;
          settled = true;
          cleanup();
          setResourceStatus(key, "failed");
          styleLoadRegistry.delete(key);
          reject(new Error("Failed to load stylesheet: " + href));
        };
        var timeoutId = setTimeout(function () {
          if (settled) return;
          settled = true;
          cleanup();
          setResourceStatus(key, "failed");
          styleLoadRegistry.delete(key);
          reject(new Error("Failed to load stylesheet (timeout): " + href));
        }, cssLoadTimeoutMs);
        link.addEventListener("load", onLoad);
        link.addEventListener("error", onError);
        try {
          if (link.sheet && !link.disabled) {
            onLoad();
          }
        } catch (error) {
          // ignore and wait load/error
        }
      });
      styleLoadRegistry.set(key, task);
      return task;
    };

    var cssPromise = Promise.all(cssFiles.map(loadStyle));
    var vuePromise = loadScript("./vendor/vue.global.prod.js");
    var dataPromise = Promise.all([
      loadScript("./data/dungeons.js"),
      loadScript("./data/weapons.js"),
      loadScript("./data/weapon-images.js"),
      loadScript("./data/i18n.zh-CN.js"),
    ]);
    var scriptChainPromise = loadScript("./js/app.script-chain.js");
    var domReadyPromise =
      document.readyState === "loading"
        ? new Promise(function (resolve) {
            document.addEventListener("DOMContentLoaded", resolve, { once: true });
          })
        : Promise.resolve();

    Promise.all([domReadyPromise, cssPromise, vuePromise, dataPromise, scriptChainPromise])
      .then(function () {
        if (
          !declaredAppScriptChain.length &&
          Array.isArray(window.__APP_SCRIPT_CHAIN) &&
          window.__APP_SCRIPT_CHAIN.length
        ) {
          declaredAppScriptChain = window.__APP_SCRIPT_CHAIN.slice();
          declaredAppScriptChain.forEach(function (src) {
            ensureResource(src, "script");
          });
          renderProgress();
        }
        return loadScript("./js/app.js");
      })
      .catch(function (error) {
        if (runId !== runSerial) return;
        finish();
        var failedMessage = String((error && error.message) || "");
        var failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
        var failedStyle = failedMessage
          .replace(/^Failed to load stylesheet(?: \(timeout\))?:\s*/i, "")
          .trim();
        var isCssFailure = failedMessage.indexOf("stylesheet") !== -1;
        if (isCssFailure) {
          window.__renderBootError({
            title: "页面样式加载失败",
            summary: "关键样式文件未能完整加载，页面无法正常展示。",
            details: [failedStyle ? "失败样式：" + failedStyle : "失败样式：未知"],
            suggestions: ["点击“重试加载”重新请求关键资源", "按 Ctrl + F5 强制刷新后重试"],
          });
        } else if (typeof window.__reportScriptLoadFailure === "function") {
          window.__reportScriptLoadFailure(failedScript);
        } else {
          window.__renderBootError({
            title: "页面资源加载失败",
            summary: "核心资源未能完整加载，应用暂时无法启动。",
            details: [failedScript ? "失败资源：" + failedScript : "失败资源：未知"],
            suggestions: ["点击“重试加载”重新请求关键资源", "按 Ctrl + F5 强制刷新后重试"],
          });
        }
      })
      .finally(function () {
        if (runId === runSerial) {
          window.__bootstrapEntryRunning = false;
        }
      });
  };

  window.__startBootstrapEntry = startBootstrap;
  startBootstrap({ fromRetry: false });
})();
