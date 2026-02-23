(function () {

  const renderBootError = (payload) => {
    if (typeof window !== "undefined" && typeof window.__renderBootError === "function") {
      window.__renderBootError(payload);
      return;
    }
    const fallback = document.createElement("div");
    fallback.style.cssText = "padding:24px;color:#f36c6c;font-family:Microsoft YaHei UI;";
    fallback.textContent = "页面加载失败，请刷新后重试。";
    document.body.textContent = "";
    document.body.appendChild(fallback);
  };

  const loadScript =
    (typeof window !== "undefined" && window.__loadScript) ||
    ((src) =>
      new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load: " + src));
        document.body.appendChild(script);
      }));

  if (typeof window !== "undefined" && !window.__loadScript) {
    window.__loadScript = loadScript;
  }

  const scripts =
    typeof window !== "undefined" &&
    Array.isArray(window.__APP_SCRIPT_CHAIN) &&
    window.__APP_SCRIPT_CHAIN.length
      ? window.__APP_SCRIPT_CHAIN
      : [];

  if (!scripts.length) {
    if (typeof window !== "undefined" && typeof window.__reportScriptChainMissing === "function") {
      window.__reportScriptChainMissing();
    } else {
      renderBootError({
        title: "页面资源加载失败",
        summary: "脚本加载清单缺失，应用暂时无法启动。",
      });
    }
    return;
  }

  scripts
    .reduce((promise, src) => promise.then(() => loadScript(src)), Promise.resolve())
    .catch((error) => {
      const failedMessage = String((error && error.message) || "");
      const failedScript = failedMessage.replace(/^Failed to load:\s*/i, "");
      if (typeof window !== "undefined" && typeof window.__reportScriptLoadFailure === "function") {
        window.__reportScriptLoadFailure(failedScript);
      } else {
        renderBootError({
          title: "页面资源加载失败",
          summary: "核心脚本未能完整加载，应用暂时无法启动。",
          details: [failedScript ? `失败资源：${failedScript}` : "失败资源：未知"],
        });
      }
    });
})();
