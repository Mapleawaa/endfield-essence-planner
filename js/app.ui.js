(function () {
  const modules = (window.AppModules = window.AppModules || {});

  modules.initUi = function initUi(ctx, state) {
    const { onMounted, onBeforeUnmount, nextTick, watch } = ctx;

    const showBackToTop = state.showBackToTop;
    const showLangMenu = state.showLangMenu;
    const showSecondaryMenu = state.showSecondaryMenu;
    const showPlanConfig = state.showPlanConfig;
    const showPlanConfigHintDot = state.showPlanConfigHintDot;
    const isPortrait = state.isPortrait;
    const isAdPortrait = state.isAdPortrait;
    const canShowAds = state.canShowAds;
    const updateLangMenuPlacement = state.updateLangMenuPlacement;
    const loadScriptOnce = state.loadScriptOnce;

    const root = typeof document !== "undefined" ? document.documentElement : null;

    const allowedAdHosts = new Set(["end.canmoe.com", "127.0.0.1"]);
    const adworkScriptSrc = "https://cdn.adwork.net/js/makemoney.js";
    const adMobileBreakpoint = 960;
    let adScriptLoadingPromise = null;

    const evaluateAdVisibility = () => {
      if (typeof window === "undefined") {
        canShowAds.value = false;
        return;
      }
      if (window.__adworkScriptError) {
        canShowAds.value = false;
        return;
      }
      const host = (window.location && window.location.hostname ? window.location.hostname : "").toLowerCase();
      canShowAds.value = allowedAdHosts.has(host);
    };

    const handleAdFailed = () => {
      canShowAds.value = false;
      scheduleAdSlotVisibility();
    };

    const ensureAdScriptLoaded = () => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.resolve(false);
      }
      if (!canShowAds.value || window.__adworkScriptError) {
        return Promise.resolve(false);
      }
      if (window.__adworkScriptReady) {
        return Promise.resolve(true);
      }
      if (adScriptLoadingPromise) {
        return adScriptLoadingPromise;
      }
      const loadTask =
        typeof loadScriptOnce === "function"
          ? loadScriptOnce(adworkScriptSrc)
          : new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = adworkScriptSrc;
              script.async = true;
              script.onload = resolve;
              script.onerror = reject;
              document.body.appendChild(script);
            });
      adScriptLoadingPromise = loadTask
        .then(() => {
          window.__adworkScriptReady = true;
          scheduleAdSlotVisibility();
          primeAdSlotVisibility();
          return true;
        })
        .catch(() => {
          window.__adworkScriptError = true;
          window.dispatchEvent(new Event("adwork:failed"));
          return false;
        })
        .finally(() => {
          adScriptLoadingPromise = null;
        });
      return adScriptLoadingPromise;
    };

    const adSlotSelector = ".adwork-hero-slot, .scheme-inline-ad-top";
    let adSlotVisibilityRaf = null;
    let adSlotVisibilityTimers = [];

    const clearAdSlotTimers = () => {
      if (!adSlotVisibilityTimers.length) return;
      adSlotVisibilityTimers.forEach((timer) => clearTimeout(timer));
      adSlotVisibilityTimers = [];
    };

    const hasRenderableAdContent = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (Number(style.opacity || 1) === 0) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 120 && rect.height >= 20;
    };

    const isLikelyPlaceholderNode = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const text = (node.textContent || "").trim();
      if (text && text.length > 0) {
        const normalized = text.toLowerCase();
        if (
          normalized.includes("广告") ||
          normalized.includes("ad") ||
          normalized.includes("placeholder") ||
          normalized.includes("审核")
        ) {
          return true;
        }
      }
      const className = (node.className || "").toString().toLowerCase();
      if (
        className.includes("placeholder") ||
        className.includes("ad-placeholder") ||
        className.includes("adwork-placeholder")
      ) {
        return true;
      }
      const bg = window.getComputedStyle(node).backgroundColor;
      return bg === "rgb(255, 255, 255)" || bg === "rgba(255, 255, 255, 1)";
    };

    const hasMeaningfulAdChildren = (node) => {
      if (!(node instanceof HTMLElement)) return false;
      const children = Array.from(node.children || []);
      if (!children.length) return false;
      return children.some((child) => {
        if (!(child instanceof HTMLElement)) return false;
        if (child.matches("script, style, link, meta")) return false;
        if (child.matches("iframe, img, ins, object, embed, video, canvas, svg, a, button")) {
          return true;
        }
        const text = (child.textContent || "").trim();
        if (text.length > 0) return true;
        return hasRenderableAdContent(child);
      });
    };

    const updateAdSlotVisibility = () => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      const slots = document.querySelectorAll(adSlotSelector);
      slots.forEach((slot) => {
        const container = slot.querySelector(".adwork-net");
        const hasContainer = container instanceof HTMLElement;
        const richNodes =
          hasContainer
            ? Array.from(
                container.querySelectorAll("iframe, img, ins, object, embed, video, canvas, svg")
              )
            : [];
        const hasRichRenderable = richNodes.some(hasRenderableAdContent);
        const hasMeaningfulChildren =
          hasContainer && hasMeaningfulAdChildren(container);
        const hasContainerRenderable =
          hasContainer && hasRenderableAdContent(container);
        const placeholderLike =
          hasContainer && !hasRichRenderable && isLikelyPlaceholderNode(container);
        const hasRenderable = hasRichRenderable || (hasMeaningfulChildren && hasContainerRenderable);
        const shouldHardHide = !canShowAds.value || !hasContainer || placeholderLike;
        const shouldSoftHide = !shouldHardHide && !hasRenderable;
        slot.classList.toggle("is-ad-hidden", shouldHardHide);
        slot.classList.toggle("is-ad-soft-hidden", shouldSoftHide);
      });
    };

    const scheduleAdSlotVisibility = () => {
      if (typeof window === "undefined") return;
      if (adSlotVisibilityRaf) {
        cancelAnimationFrame(adSlotVisibilityRaf);
      }
      adSlotVisibilityRaf = requestAnimationFrame(() => {
        adSlotVisibilityRaf = null;
        updateAdSlotVisibility();
      });
    };

    const primeAdSlotVisibility = () => {
      clearAdSlotTimers();
      [80, 360, 900, 1800, 3200].forEach((delay) => {
        adSlotVisibilityTimers.push(
          setTimeout(() => {
            scheduleAdSlotVisibility();
          }, delay)
        );
      });
    };

    const handleAdPotentialMutation = () => {
      scheduleAdSlotVisibility();
      if (typeof window !== "undefined") {
        setTimeout(() => scheduleAdSlotVisibility(), 120);
      }
    };

    const resolveTheme = (mode) => {
      if (mode === "light" || mode === "dark") return mode;
      if (typeof window === "undefined" || !window.matchMedia) return "dark";
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    };

    const applyTheme = (mode) => {
      const resolved = resolveTheme(mode);
      state.resolvedTheme.value = resolved;
      if (!root) return;
      root.setAttribute("data-theme", resolved);
      root.style.colorScheme = resolved;
    };

    const setThemeMode = (mode) => {
      const normalized = mode === "light" || mode === "dark" ? mode : "auto";
      state.themePreference.value = normalized;
      applyTheme(normalized);
    };

    let mediaTheme = null;
    let removeMediaThemeListener = null;

    const bindSystemThemeListener = () => {
      if (typeof window === "undefined" || !window.matchMedia) return;
      mediaTheme = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => {
        if (state.themePreference.value === "auto") {
          applyTheme("auto");
        }
      };
      if (typeof mediaTheme.addEventListener === "function") {
        mediaTheme.addEventListener("change", onChange);
        removeMediaThemeListener = () => mediaTheme.removeEventListener("change", onChange);
      } else if (typeof mediaTheme.addListener === "function") {
        mediaTheme.addListener(onChange);
        removeMediaThemeListener = () => mediaTheme.removeListener(onChange);
      }
    };

    const backToTopRevealOffset = 240;
    const backToTopScrollDelta = 6;
    const backToTopIdleDelay = 200;
    let backToTopLastScroll = 0;
    let backToTopTimer = null;
    let viewportSafeBottomRaf = null;

    const updateViewportOrientation = () => {
      if (typeof window === "undefined") return;
      if (window.matchMedia) {
        isPortrait.value = window.matchMedia("(orientation: portrait)").matches;
      } else {
        isPortrait.value = window.innerHeight >= window.innerWidth;
      }
      isAdPortrait.value = window.innerWidth <= adMobileBreakpoint;
      if (showLangMenu.value && updateLangMenuPlacement) {
        if (typeof nextTick === "function") {
          nextTick(updateLangMenuPlacement);
        } else {
          updateLangMenuPlacement();
        }
      }
    };

    updateViewportOrientation();

    const updateViewportSafeBottom = () => {
      if (typeof window === "undefined") return;
      const root = document.documentElement;
      if (!root) return;
      const viewport = window.visualViewport;
      if (!viewport) {
        root.style.removeProperty("--viewport-safe-bottom");
        return;
      }
      const blocked = Math.max(
        0,
        Math.round(window.innerHeight - (viewport.height + viewport.offsetTop))
      );
      root.style.setProperty("--viewport-safe-bottom", `${blocked}px`);
    };

    const scheduleViewportSafeBottom = () => {
      if (viewportSafeBottomRaf) return;
      viewportSafeBottomRaf = requestAnimationFrame(() => {
        viewportSafeBottomRaf = null;
        updateViewportSafeBottom();
      });
    };

    const clearBackToTopTimer = () => {
      if (backToTopTimer) {
        clearTimeout(backToTopTimer);
        backToTopTimer = null;
      }
    };

    const updateBackToTopVisibility = () => {
      if (typeof window === "undefined") return;
      const current = window.scrollY || window.pageYOffset || 0;
      const delta = current - backToTopLastScroll;
      if (current < backToTopRevealOffset) {
        showBackToTop.value = false;
      } else if (delta > backToTopScrollDelta) {
        showBackToTop.value = false;
      } else if (delta < -backToTopScrollDelta) {
        showBackToTop.value = true;
      }
      backToTopLastScroll = current;
      clearBackToTopTimer();
      backToTopTimer = setTimeout(() => {
        const position = window.scrollY || window.pageYOffset || 0;
        if (position >= backToTopRevealOffset) {
          showBackToTop.value = true;
        }
      }, backToTopIdleDelay);
    };

    const handleBackToTopScroll = () => {
      updateBackToTopVisibility();
    };

    const scrollToTop = () => {
      if (typeof window === "undefined") return;
      if (typeof window.scrollTo === "function") {
        try {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        } catch (error) {
          // ignore and fall back
        }
      }
      window.scrollTo(0, 0);
    };

    const markPlanConfigHintSeen = () => {
      if (!showPlanConfigHintDot.value) return;
      showPlanConfigHintDot.value = false;
      try {
        localStorage.setItem(state.planConfigHintStorageKey, state.planConfigHintVersion);
      } catch (error) {
        // ignore storage errors
      }
    };

    const togglePlanConfig = () => {
      const nextOpen = !showPlanConfig.value;
      showPlanConfig.value = nextOpen;
      if (nextOpen) {
        markPlanConfigHintSeen();
      }
    };

    const handleDocClick = (event) => {
      if (!event || !event.target || !event.target.closest) {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
        return;
      }
      if (showSecondaryMenu.value && !event.target.closest(".secondary-menu")) {
        showSecondaryMenu.value = false;
      }
      if (showPlanConfig.value && !event.target.closest(".plan-config")) {
        showPlanConfig.value = false;
      }
      if (showLangMenu.value && !event.target.closest(".lang-switch")) {
        showLangMenu.value = false;
      }
    };

    const handleDocKeydown = (event) => {
      if (!event) return;
      if (event.key === "Escape") {
        showSecondaryMenu.value = false;
        showPlanConfig.value = false;
        showLangMenu.value = false;
      }
    };

    onMounted(() => {
      state.appReady.value = true;
      bindSystemThemeListener();
      applyTheme(state.themePreference.value || "auto");
      updateViewportOrientation();
      window.addEventListener("resize", updateViewportOrientation);
      updateViewportSafeBottom();
      window.addEventListener("resize", scheduleViewportSafeBottom);
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", scheduleViewportSafeBottom);
        window.visualViewport.addEventListener("scroll", scheduleViewportSafeBottom);
      }
      if (typeof window !== "undefined") {
        backToTopLastScroll = window.scrollY || window.pageYOffset || 0;
        updateBackToTopVisibility();
        window.addEventListener("scroll", handleBackToTopScroll, { passive: true });
        evaluateAdVisibility();
        window.addEventListener("adwork:failed", handleAdFailed);
        window.addEventListener("resize", scheduleAdSlotVisibility);
        if (canShowAds.value) {
          if (typeof nextTick === "function") {
            nextTick(() => {
              ensureAdScriptLoaded();
            });
          } else {
            ensureAdScriptLoaded();
          }
        }
      }
      document.addEventListener("click", handleAdPotentialMutation, true);
      document.addEventListener("click", handleDocClick);
      document.addEventListener("keydown", handleDocKeydown);
      primeAdSlotVisibility();
      if (typeof nextTick === "function") {
        nextTick(() => requestAnimationFrame(() => finishPreload()));
      } else {
        requestAnimationFrame(() => finishPreload());
      }
    });

    watch([canShowAds, isAdPortrait], () => {
      if (canShowAds.value) {
        ensureAdScriptLoaded();
      }
      primeAdSlotVisibility();
    });

    onBeforeUnmount(() => {
      if (removeMediaThemeListener) {
        removeMediaThemeListener();
        removeMediaThemeListener = null;
      }
      mediaTheme = null;
      window.removeEventListener("resize", updateViewportOrientation);
      window.removeEventListener("resize", scheduleViewportSafeBottom);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", scheduleViewportSafeBottom);
        window.visualViewport.removeEventListener("scroll", scheduleViewportSafeBottom);
      }
      if (viewportSafeBottomRaf) {
        cancelAnimationFrame(viewportSafeBottomRaf);
        viewportSafeBottomRaf = null;
      }
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", handleBackToTopScroll);
        window.removeEventListener("adwork:failed", handleAdFailed);
        window.removeEventListener("resize", scheduleAdSlotVisibility);
      }
      if (adSlotVisibilityRaf) {
        cancelAnimationFrame(adSlotVisibilityRaf);
        adSlotVisibilityRaf = null;
      }
      clearAdSlotTimers();
      document.removeEventListener("click", handleAdPotentialMutation, true);
      clearBackToTopTimer();
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("keydown", handleDocKeydown);
    });

    state.scrollToTop = scrollToTop;
    state.setThemeMode = setThemeMode;
    state.togglePlanConfig = togglePlanConfig;
  };
})();
