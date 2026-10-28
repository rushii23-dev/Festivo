// Applies the saved motion preference before first paint to avoid a flash of
// animation. The site has a single light theme, so nothing else is needed.
// Mirrors lib/prefs/preferences.ts; kept tiny and dependency-free on purpose.
(function () {
  var prefs = {};
  try {
    prefs = JSON.parse(localStorage.getItem("festivo:prefs") || "{}") || {};
  } catch {
    prefs = {};
  }
  var reduce =
    prefs.reduceMotion === true ||
    (typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches);
  document.documentElement.setAttribute("data-motion", reduce ? "reduce" : "full");
})();
