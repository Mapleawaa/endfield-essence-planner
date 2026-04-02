(function () {
  window.characters = window.characters || [];
  const scripts = window.__APP_CHARACTER_SCRIPTS__ || [];
  const tangtangScript = "./data/characters/tangtang.js";
  if (!scripts.includes(tangtangScript)) {
    scripts.push(tangtangScript);
  }
  const rossiScript = "./data/characters/rossi.js";
  if (!scripts.includes(rossiScript)) {
    scripts.push(rossiScript);
  }
  window.__APP_CHARACTER_SCRIPTS__ = scripts;
})();
