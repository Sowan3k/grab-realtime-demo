// passenger.js — Passenger app panel (Phase 4)
// Reuses the shared WebSocket opened by driver.js via window.wsSubscribe / window.wsSocket.

(function () {
  // ── Internal state ─────────────────────────────────────────────────────────
  let _nextUpdateAt       = null;
  let _multiplierHistory  = [];

  // ── WebSocket status dot ───────────────────────────────────────────────────
  // Rechecked every 500 ms so a server stop flips the dot red within ~1 s.
  function _updatePaxWsStatus() {
    const dot   = document.getElementById("pax-ws-dot");
    const label = document.getElementById("pax-ws-label");
    if (!dot || !label) return;
    const connected = window.wsSocket && window.wsSocket.readyState === 1;
    if (connected) {
      dot.classList.add("connected");
      label.textContent = "CONNECTED";
    } else {
      dot.classList.remove("connected");
      label.textContent = "DISCONNECTED";
    }
  }
  setInterval(_updatePaxWsStatus, 500);
  _updatePaxWsStatus();

  // ── Countdown ticker ───────────────────────────────────────────────────────
  // Ticks every 100 ms; derives remaining seconds from nextUpdateAt pushed by server.
  setInterval(function () {
    const el = document.getElementById("countdown");
    if (!el) return;
    if (_nextUpdateAt === null) { el.textContent = "next update in —"; return; }
    const remaining = Math.max(0, (_nextUpdateAt - Date.now()) / 1000);
    el.textContent = `next update in ${remaining.toFixed(1)} s`;
  }, 100);

  // ── Sparkline ──────────────────────────────────────────────────────────────
  // Inline SVG; no library. Y range: 1.0 to (max + 0.2 headroom).
  // Path is snapped on every update — not animated per spec.
  function _buildSparkline(history) {
    const svg = document.getElementById("sparkline");
    if (!svg) return;
    if (history.length < 2) { svg.innerHTML = ""; return; }

    const W = svg.getBoundingClientRect().width || 300;
    const H = 48;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width",   W);
    svg.setAttribute("height",  H);

    const yMin  = 1.0;
    const yMax  = Math.max(...history) + 0.2;
    const range = yMax - yMin || 1;
    const xStep = W / (history.length - 1);

    const toX = (i) => i * xStep;
    const toY = (v) => H - ((v - yMin) / range) * H;

    const d = history
      .map((v, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`)
      .join(" ");

    const lastX = toX(history.length - 1).toFixed(1);
    const lastY = toY(history[history.length - 1]).toFixed(1);

    svg.innerHTML =
      `<path d="${d}" stroke="var(--brand)" stroke-width="1.5" fill="none"` +
        ` stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="${lastX}" cy="${lastY}" r="4" fill="var(--brand)"/>` +
      `<circle cx="${lastX}" cy="${lastY}" r="6" fill="none"` +
        ` stroke="var(--brand)" stroke-width="1.5" opacity="0.5"/>`;
  }

  // ── Multiplier digit animation ─────────────────────────────────────────────
  // 200ms scale bump to 1.04 + 150ms brand color flash, then back to normal.
  let _flashTimeout = null;

  function _animateMultiplier() {
    const el = document.getElementById("multiplier");
    if (!el) return;
    if (_flashTimeout) clearTimeout(_flashTimeout);
    el.classList.add("multiplier-flash");
    _flashTimeout = setTimeout(() => el.classList.remove("multiplier-flash"), 350);
  }

  // ── surge_update handler ───────────────────────────────────────────────────
  window.wsSubscribe("surge_update", function (msg) {
    // Multiplier
    const multEl = document.getElementById("multiplier");
    if (multEl) { multEl.textContent = `${msg.multiplier.toFixed(2)}×`; }
    _animateMultiplier();

    // Fare preview: 5 km × RM 1.50/km × multiplier
    const fareEl = document.getElementById("fare-preview");
    if (fareEl) { fareEl.textContent = `RM ${(5 * 1.5 * msg.multiplier).toFixed(2)}`; }

    // Reset countdown
    _nextUpdateAt = msg.nextUpdateAt;

    // Sparkline — prefer server-authoritative history; fall back to local accumulation.
    if (msg.multiplierHistory && msg.multiplierHistory.length > 0) {
      _multiplierHistory = msg.multiplierHistory;
    } else {
      _multiplierHistory.push(msg.multiplier);
      if (_multiplierHistory.length > 20) _multiplierHistory.shift();
    }
    _buildSparkline(_multiplierHistory);

    // Latency badge — deadline is 500 ms (PRICE_PUSH_DEADLINE_MS)
    const latEl = document.getElementById("pax-latency");
    if (latEl) {
      const ms = msg.pushLatencyMs;
      latEl.textContent = `price arrived in ${ms} ms`;
      latEl.className =
        "latency-badge" + (ms > 500 ? " over" : ms > 350 ? " warn" : "");
    }
  });

  // ── init — pre-populate before first surge_update arrives ─────────────────
  window.wsSubscribe("init", function (msg) {
    if (msg.multiplierHistory) { _multiplierHistory = msg.multiplierHistory; }

    const multEl = document.getElementById("multiplier");
    if (multEl && msg.currentMultiplier != null) {
      multEl.textContent = `${msg.currentMultiplier.toFixed(2)}×`;
    }

    const fareEl = document.getElementById("fare-preview");
    if (fareEl && msg.currentMultiplier != null) {
      fareEl.textContent = `RM ${(5 * 1.5 * msg.currentMultiplier).toFixed(2)}`;
    }

    if (_multiplierHistory.length >= 2) { _buildSparkline(_multiplierHistory); }
  });

  // Redraw sparkline on window resize (SVG width changes).
  window.addEventListener("resize", function () { _buildSparkline(_multiplierHistory); });
})();
