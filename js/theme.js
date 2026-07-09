/* Light/dark theme toggle. Applies the saved choice before paint (no flash),
   overriding the OS preference; the button flips and persists it. Shared by
   every page. */
(function () {
  var KEY = "dinotheme";
  var root = document.documentElement;
  // apply saved choice immediately (this script is in <head>, runs before body)
  try { var saved = localStorage.getItem(KEY); if (saved) root.setAttribute("data-theme", saved); } catch (e) {}

  function current() {
    var t = root.getAttribute("data-theme");
    if (t) return t;
    return (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  function updateBtn() {
    var b = document.getElementById("theme-toggle");
    if (!b) return;
    var dark = current() === "dark";
    b.textContent = dark ? "☀️" : "🌙";
    b.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }
  function apply(t) { root.setAttribute("data-theme", t); try { localStorage.setItem(KEY, t); } catch (e) {} updateBtn(); }
  function wire() {
    var b = document.getElementById("theme-toggle");
    if (b) b.onclick = function () { apply(current() === "dark" ? "light" : "dark"); };
    updateBtn();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
