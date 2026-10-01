/* IconVault embeddable icon picker v1.
 *
 * Usage:
 *   <div data-iconvault-picker data-theme="light"></div>
 *   <script src="https://iconvault.site/embed/v1.js" defer></script>
 *
 * Optional attributes on the div:
 *   data-theme="light|dark"   color scheme (default light)
 *   data-limit="24"           results per search, 1-48 (default 24)
 *   data-query="arrow"        run this search on load
 *
 * Behavior: type to search the IconVault library, click any icon to copy
 * its SVG markup to the clipboard. No API key needed; public per-minute
 * rate limits apply. Vanilla JS, no dependencies, XSS-safe (all icon names
 * are HTML-escaped before rendering).
 */
(function () {
  "use strict";

  var API_BASE = "https://iconvault.site";
  try {
    var cur = document.currentScript;
    if (cur && cur.src) API_BASE = new URL(cur.src).origin;
    var override = cur && cur.getAttribute("data-api");
    if (override) API_BASE = String(override).replace(/\/+$/, "");
  } catch (e) { /* keep default */ }

  var ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return ESCAPE_MAP[c]; });
  }

  var CSS = [
    ".ivp{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;",
    "border:1px solid var(--ivp-border);border-radius:16px;background:var(--ivp-bg);",
    "color:var(--ivp-fg);padding:14px;max-width:640px;--ivp-border:#e5e7eb;--ivp-bg:#ffffff;",
    "--ivp-fg:#111827;--ivp-muted:#6b7280;--ivp-tile:#f9fafb;--ivp-tile-h:#f3f4f6;--ivp-accent:#0f766e}",
    ".ivp-dark{--ivp-border:#2a2f3a;--ivp-bg:#141821;--ivp-fg:#f3f4f6;--ivp-muted:#9aa3b2;",
    "--ivp-tile:#1c2230;--ivp-tile-h:#242c3d;--ivp-accent:#2dd4bf}",
    ".ivp-search{display:flex;align-items:center;gap:8px;border:1px solid var(--ivp-border);",
    "border-radius:12px;padding:9px 12px;background:var(--ivp-tile)}",
    ".ivp-search:focus-within{border-color:var(--ivp-accent);outline:2px solid color-mix(in srgb,var(--ivp-accent) 25%,transparent)}",
    ".ivp-input{flex:1;border:0;background:transparent;color:var(--ivp-fg);font-size:14px;outline:none;min-width:0}",
    ".ivp-input::placeholder{color:var(--ivp-muted)}",
    ".ivp-status{font-size:12px;color:var(--ivp-muted);margin:8px 2px;min-height:16px}",
    ".ivp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;max-height:340px;overflow:auto}",
    ".ivp-tile{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;",
    "border:1px solid transparent;border-radius:12px;background:var(--ivp-tile);cursor:pointer;color:var(--ivp-fg)}",
    ".ivp-tile:hover{background:var(--ivp-tile-h);border-color:var(--ivp-border)}",
    ".ivp-tile:focus-visible{outline:2px solid var(--ivp-accent);outline-offset:1px}",
    ".ivp-tile img{width:28px;height:28px;display:block}",
    ".ivp-dark .ivp-tile img{filter:invert(0.9)}",
    ".ivp-name{font-size:10px;color:var(--ivp-muted);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
    ".ivp-toast{position:sticky;bottom:4px;margin:8px auto 0;width:max-content;max-width:100%;",
    "background:#111827;color:#fff;font-size:12px;padding:7px 14px;border-radius:999px;",
    "opacity:0;transform:translateY(6px);transition:opacity .18s,transform .18s;pointer-events:none}",
    ".ivp-dark .ivp-toast{background:#f3f4f6;color:#111827}",
    ".ivp-toast.ivp-show{opacity:1;transform:none}",
    ".ivp-brand{font-size:11px;color:var(--ivp-muted);margin-top:8px;text-align:right}",
    ".ivp-brand a{color:var(--ivp-accent);text-decoration:none}"
  ].join("");

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    }
    fallbackCopy(text);
    return Promise.resolve();
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
  }

  function mount(root) {
    if (root.__ivpMounted) return;
    root.__ivpMounted = true;

    var theme = root.getAttribute("data-theme") === "dark" ? "ivp-dark" : "";
    var limit = parseInt(root.getAttribute("data-limit") || "24", 10);
    if (!isFinite(limit)) limit = 24;
    limit = Math.min(48, Math.max(1, limit));

    root.className = (root.className + " ivp " + theme).trim();
    root.innerHTML =
      "<style>" + CSS + "</style>" +
      '<div class="ivp-search"><input class="ivp-input" type="search" autocomplete="off" ' +
      'placeholder="Search 421,020 icons..." aria-label="Search icons"></div>' +
      '<div class="ivp-status" role="status" aria-live="polite"></div>' +
      '<div class="ivp-grid" role="listbox" aria-label="Icon results"></div>' +
      '<div class="ivp-toast" role="status"></div>' +
      '<div class="ivp-brand">Icons by <a href="https://iconvault.site" target="_blank" rel="noopener">IconVault</a></div>';

    var input = root.querySelector(".ivp-input");
    var grid = root.querySelector(".ivp-grid");
    var status = root.querySelector(".ivp-status");
    var toastEl = root.querySelector(".ivp-toast");
    var toastTimer = null;
    var seq = 0;

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("ivp-show");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("ivp-show"); }, 1600);
    }

    function doSearch(q) {
      q = String(q || "").trim();
      var my = ++seq;
      if (!q) { grid.innerHTML = ""; status.textContent = ""; return; }
      status.textContent = "Searching...";
      fetch(API_BASE + "/api/iconify/search?query=" + encodeURIComponent(q) + "&limit=" + limit)
        .then(function (res) {
          if (!res.ok) throw new Error("http " + res.status);
          return res.json();
        })
        .then(function (data) {
          if (my !== seq) return;
          var icons = Array.isArray(data.icons) ? data.icons.slice(0, limit) : [];
          status.textContent = icons.length
            ? (typeof data.total === "number" ? data.total.toLocaleString() : icons.length) + " results - click any icon to copy its SVG."
            : "No icons found. Try another word.";
          var html = "";
          for (var i = 0; i < icons.length; i++) {
            var id = String(icons[i]);
            var safe = esc(id);
            var ci = id.indexOf(":");
            if (ci <= 0) continue;
            var img = API_BASE + "/api/icon/" + encodeURIComponent(id.slice(0, ci)) +
              "/" + encodeURIComponent(id.slice(ci + 1)) + ".svg";
            html += '<button type="button" class="ivp-tile" role="option" data-id="' + safe +
              '" data-svg="' + esc(img) + '" title="' + safe + '" aria-label="Copy ' + safe + ' SVG">' +
              '<img loading="lazy" src="' + esc(img) + '" alt="" width="28" height="28">' +
              '<span class="ivp-name">' + safe + "</span></button>";
          }
          grid.innerHTML = html;
        })
        .catch(function () {
          if (my !== seq) return;
          status.textContent = "Search failed. Check your connection and try again.";
        });
    }

    var deb = null;
    input.addEventListener("input", function () {
      if (deb) clearTimeout(deb);
      deb = setTimeout(function () { doSearch(input.value); }, 300);
    });

    grid.addEventListener("click", function (e) {
      var tile = e.target && e.target.closest ? e.target.closest(".ivp-tile") : null;
      if (!tile) return;
      var id = tile.getAttribute("data-id");
      var svgUrl = tile.getAttribute("data-svg");
      fetch(svgUrl)
        .then(function (res) {
          if (!res.ok) throw new Error("http " + res.status);
          return res.text();
        })
        .then(function (svg) {
          return copyText(svg.trim()).then(function () { toast("Copied " + id); });
        })
        .catch(function () { toast("Copy failed. Try again."); });
    });

    var q0 = root.getAttribute("data-query");
    if (q0) { input.value = q0; doSearch(q0); }
  }

  function init() {
    var nodes = document.querySelectorAll("div[data-iconvault-picker]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Pick up pickers added later (SPA navigations, dynamic content).
  if (typeof MutationObserver !== "undefined") {
    new MutationObserver(function (mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (!node || node.nodeType !== 1) continue;
          if (node.matches && node.matches("div[data-iconvault-picker]")) mount(node);
          if (node.querySelectorAll) {
            var inner = node.querySelectorAll("div[data-iconvault-picker]");
            for (var k = 0; k < inner.length; k++) mount(inner[k]);
          }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
