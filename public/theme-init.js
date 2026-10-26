// Applies saved theme and motion preferences before first paint to avoid a flash.
// Mirrors lib/prefs/preferences.ts; kept tiny and dependency-free on purpose.
(function () {
  var root = document.documentElement;
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem("festivo:prefs") || "{}") || {};
  } catch {
    prefs = {};
  }
  var media = function (q) {
    return typeof matchMedia === "function" && matchMedia(q).matches;
  };
  var theme =
    prefs.theme === "light" || prefs.theme === "dark"
      ? prefs.theme
      : media("(prefers-color-scheme: dark)")
        ? "dark"
        : "light";
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = theme;
  var reduce = prefs.reduceMotion === true || media("(prefers-reduced-motion: reduce)");
  root.setAttribute("data-motion", reduce ? "reduce" : "full");
})();
