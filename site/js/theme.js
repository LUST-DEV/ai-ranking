// Runs before first paint (classic script in <head>) to avoid a flash of the wrong theme.
(function () {
  var theme = null;
  try { theme = JSON.parse(localStorage.getItem("theme")); } catch (e) { /* ignore */ }
  if (theme !== "light" && theme !== "dark") theme = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
})();
