// Sets data-motion before first paint: the site animates unless the device asks
// for reduced motion. Mirrors lib/prefs/preferences.ts; kept tiny on purpose.
(function () {
  var reduce =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.setAttribute("data-motion", reduce ? "reduce" : "full");
})();
