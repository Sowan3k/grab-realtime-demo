// code-panel.js — Phase 5: Source code display + live CFG path highlighting.
// Reuses shared WebSocket from driver.js via window.wsSubscribe.

// ── Source constants — must match server files exactly ────────────────────
const FATIGUE_SRC =
`function evaluateFatigueAlert(driverId, cumulativeMin, sensorRisk) {
  const TIME_LIMIT = 240; // minutes
  const RISK_THRESHOLD = 0.8;
  if (cumulativeMin > TIME_LIMIT) {
    pushAlert(driverId, "time_based");
    logSafetyEvent(driverId, "FATIGUE_TIME");
    return true;
  }
  if (sensorRisk > RISK_THRESHOLD) {
    pushAlert(driverId, "sensor_based");
    logSafetyEvent(driverId, "FATIGUE_SENSOR");
    return true;
  }
  return false;
}`;

const PRICING_SRC =
`const MAX_MULTIPLIER = 3.5;
const MIN_MULTIPLIER = 1.0;

// Zero-drivers path returns hard cap; normal path clamps supply/demand ratio.
function calculateSurgeMultiplier(openRequests, availableDrivers) {
  if (availableDrivers === 0) return MAX_MULTIPLIER;
  const raw = MIN_MULTIPLIER + 0.5 * (openRequests / availableDrivers);
  return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, raw));
}`;

// ── Syntax highlighter — single-pass regex, priority: comments > strings > keywords > numbers
function highlight(src) {
  const esc = src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const out = esc.replace(
    /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b(?:function|const|let|var|if|return|true|false|null)\b)|(\b\d+(?:\.\d+)?\b)/g,
    (_, com, str, kw, num) => {
      if (com) return `<span class="com">${com}</span>`;
      if (str) return `<span class="str">${str}</span>`;
      if (kw)  return `<span class="kw">${kw}</span>`;
      return `<span class="num">${num}</span>`;
    }
  );
  return `<pre><code>${out}</code></pre>`;
}

// ── CFG path definitions — node/edge IDs to highlight per branch ─────────
// Fatigue: time_based | sensor_based | null (no alert)
const F_PATHS = {
  time_based:   ['fn-start','fn-t1','fn-pt','fn-rt',   'fe-0','fe-1t','fe-2'],
  sensor_based: ['fn-start','fn-t1','fn-t2','fn-ps','fn-rs', 'fe-0','fe-1f','fe-3t','fe-4'],
  null:         ['fn-start','fn-t1','fn-t2','fn-rf',   'fe-0','fe-1f','fe-3f'],
};

// Pricing: zero_drivers | computed
const P_PATHS = {
  zero_drivers: ['pn-start','pn-check','pn-r35',             'pe-0','pe-1t'],
  computed:     ['pn-start','pn-check','pn-clamp','pn-rmult', 'pe-0','pe-1f','pe-2'],
};

// ── Glow helpers — add .cfg-active for 1500ms then auto-remove ───────────
let _fTimer = null;
let _pTimer = null;

function glowFatiguePath(ids) {
  clearTimeout(_fTimer);
  document.querySelectorAll('[id^="fn-"],[id^="fe-"]').forEach(el => {
    el.classList.remove('cfg-active');
    // Force reflow so re-adding the class restarts the animation.
    void el.offsetWidth;
  });
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('cfg-active'); });
  _fTimer = setTimeout(() => {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('cfg-active'); });
  }, 1500);
}

function glowPricingPath(ids) {
  clearTimeout(_pTimer);
  document.querySelectorAll('[id^="pn-"],[id^="pe-"]').forEach(el => {
    el.classList.remove('cfg-active');
    void el.offsetWidth;
  });
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('cfg-active'); });
  _pTimer = setTimeout(() => {
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('cfg-active'); });
  }, 1500);
}

// ── SVG builder helpers ───────────────────────────────────────────────────
// Two-line text centered at (cx, cy): lines split by \n
function svgText(id, cx, cy, lines, cls) {
  cls = cls || 'cfg-text';
  if (lines.length === 1) {
    return `<text class="${cls}" x="${cx}" y="${cy}">${lines[0]}</text>`;
  }
  const half = (lines.length - 1) / 2;
  const spans = lines.map((ln, i) =>
    `<tspan x="${cx}" dy="${i === 0 ? `${-half * 1.15}em` : '1.15em'}">${ln}</tspan>`
  ).join('');
  return `<text class="${cls}" x="${cx}" y="${cy}">${spans}</text>`;
}

// ── Fatigue CFG SVG ───────────────────────────────────────────────────────
// Three terminal paths: time_based / sensor_based / null (no alert)
// viewBox="0 0 385 300"
//
//   START (circle)
//     ↓
//   cumMin > 240? (diamond)     →T→  pushAlert(time_based) (rect)
//                                        ↓
//     ↓F                            return true [time] (terminal)
//   sensorRisk > 0.8? (diamond)  →T→  pushAlert(sensor_based) (rect)
//                                        ↓
//     ↓F                            return true [sensor] (terminal)
//   return false (terminal)
//
function buildFatigueCFG() {
  return `
<svg class="cfg-svg" viewBox="0 0 385 300" preserveAspectRatio="xMidYMid meet" aria-label="evaluateFatigueAlert control flow graph">
  <defs>
    <marker id="cfg-arrow-p" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="context-stroke"/>
    </marker>
  </defs>

  <!-- START node -->
  <circle id="fn-start" class="cfg-node" cx="165" cy="25" r="15"/>
  ${svgText(null, 165, 25, ['START'])}

  <!-- START → time-check -->
  <line id="fe-0" class="cfg-edge" x1="165" y1="40" x2="165" y2="54" marker-end="url(#cfg-arrow-p)"/>

  <!-- time-check diamond: cumMin > TIME_LIMIT -->
  <polygon id="fn-t1" class="cfg-node" points="165,55 212,78 165,101 118,78"/>
  ${svgText(null, 165, 78, ['cumMin', '&gt; 240?'])}

  <!-- T branch: time-check → push-time -->
  ${svgText(null, 232, 68, ['T'], 'cfg-branch-label')}
  <line id="fe-1t" class="cfg-edge" x1="212" y1="78" x2="249" y2="78" marker-end="url(#cfg-arrow-p)"/>

  <!-- pushAlert(time_based) rect -->
  <rect id="fn-pt" class="cfg-node" x="250" y="66" width="122" height="24"/>
  ${svgText(null, 311, 78, ['pushAlert(', '"time_based")'])}

  <!-- push-time → ret-time -->
  <line id="fe-2" class="cfg-edge" x1="311" y1="90" x2="311" y2="108" marker-end="url(#cfg-arrow-p)"/>

  <!-- return true [time] terminal -->
  <rect id="fn-rt" class="cfg-node" x="250" y="109" width="122" height="24" rx="5"/>
  ${svgText(null, 311, 121, ['return true [time]'])}

  <!-- F branch: time-check → sensor-check -->
  ${svgText(null, 148, 120, ['F'], 'cfg-branch-label')}
  <line id="fe-1f" class="cfg-edge" x1="165" y1="101" x2="165" y2="148" marker-end="url(#cfg-arrow-p)"/>

  <!-- sensor-check diamond: sensorRisk > RISK_THRESHOLD -->
  <polygon id="fn-t2" class="cfg-node" points="165,149 212,172 165,195 118,172"/>
  ${svgText(null, 165, 172, ['sensorRisk', '&gt; 0.8?'])}

  <!-- T branch: sensor-check → push-sensor -->
  ${svgText(null, 232, 162, ['T'], 'cfg-branch-label')}
  <line id="fe-3t" class="cfg-edge" x1="212" y1="172" x2="249" y2="172" marker-end="url(#cfg-arrow-p)"/>

  <!-- pushAlert(sensor_based) rect -->
  <rect id="fn-ps" class="cfg-node" x="250" y="160" width="122" height="24"/>
  ${svgText(null, 311, 172, ['pushAlert(', '"sensor_based")'])}

  <!-- push-sensor → ret-sensor -->
  <line id="fe-4" class="cfg-edge" x1="311" y1="184" x2="311" y2="202" marker-end="url(#cfg-arrow-p)"/>

  <!-- return true [sensor] terminal -->
  <rect id="fn-rs" class="cfg-node" x="250" y="203" width="122" height="24" rx="5"/>
  ${svgText(null, 311, 215, ['return true [sensor]'])}

  <!-- F branch: sensor-check → ret-false -->
  ${svgText(null, 148, 218, ['F'], 'cfg-branch-label')}
  <line id="fe-3f" class="cfg-edge" x1="165" y1="195" x2="165" y2="258" marker-end="url(#cfg-arrow-p)"/>

  <!-- return false terminal -->
  <rect id="fn-rf" class="cfg-node" x="90" y="259" width="150" height="24" rx="5"/>
  ${svgText(null, 165, 271, ['return false'])}
</svg>`;
}

// ── Pricing CFG SVG ───────────────────────────────────────────────────────
// Two terminal paths: zero_drivers (→ return 3.5) / computed (→ return multiplier)
// viewBox="0 0 385 220"
//
//   START (circle)
//     ↓
//   availableDrivers === 0? (diamond)  →T→  return 3.5 (terminal)
//     ↓F
//   clamp(1.0 + 0.5×r/d, 1.0, 3.5) (rect)
//     ↓
//   return multiplier (terminal)
//
function buildPricingCFG() {
  return `
<svg class="cfg-svg" viewBox="0 0 385 220" preserveAspectRatio="xMidYMid meet" aria-label="calculateSurgeMultiplier control flow graph">

  <!-- START node -->
  <circle id="pn-start" class="cfg-node" cx="165" cy="25" r="15"/>
  ${svgText(null, 165, 25, ['START'])}

  <!-- START → avail-check -->
  <line id="pe-0" class="cfg-edge" x1="165" y1="40" x2="165" y2="54" marker-end="url(#cfg-arrow-p)"/>

  <!-- avail-check diamond: availableDrivers === 0 -->
  <polygon id="pn-check" class="cfg-node" points="165,55 215,78 165,101 115,78"/>
  ${svgText(null, 165, 78, ['availDrivers', '=== 0?'])}

  <!-- T branch: avail-check → ret-35 -->
  ${svgText(null, 236, 68, ['T'], 'cfg-branch-label')}
  <line id="pe-1t" class="cfg-edge" x1="215" y1="78" x2="253" y2="78" marker-end="url(#cfg-arrow-p)"/>

  <!-- return MAX_MULTIPLIER (3.5) terminal -->
  <rect id="pn-r35" class="cfg-node" x="254" y="66" width="120" height="24" rx="5"/>
  ${svgText(null, 314, 78, ['return 3.5'])}

  <!-- F branch: avail-check → clamp -->
  ${svgText(null, 148, 116, ['F'], 'cfg-branch-label')}
  <line id="pe-1f" class="cfg-edge" x1="165" y1="101" x2="165" y2="133" marker-end="url(#cfg-arrow-p)"/>

  <!-- clamp() rect -->
  <rect id="pn-clamp" class="cfg-node" x="65" y="134" width="200" height="24"/>
  ${svgText(null, 165, 146, ['clamp(1.0 + 0.5×r/d,', '1.0, 3.5)'])}

  <!-- clamp → ret-mult -->
  <line id="pe-2" class="cfg-edge" x1="165" y1="158" x2="165" y2="176" marker-end="url(#cfg-arrow-p)"/>

  <!-- return multiplier terminal -->
  <rect id="pn-rmult" class="cfg-node" x="85" y="177" width="160" height="24" rx="5"/>
  ${svgText(null, 165, 189, ['return multiplier'])}
</svg>`;
}

// ── Render both blocks into the center panel ──────────────────────────────
function render() {
  const panel = document.getElementById('code-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="card-title">Source Code &amp; Control Flow Graphs</div>

    <!-- Block 1: evaluateFatigueAlert -->
    <div class="code-block">
      <div class="code-block-heading">evaluateFatigueAlert — fatigue.js</div>
      ${highlight(FATIGUE_SRC)}
      ${buildFatigueCFG()}
    </div>

    <hr class="code-block-divider"/>

    <!-- Block 2: calculateSurgeMultiplier -->
    <div class="code-block">
      <div class="code-block-heading">calculateSurgeMultiplier — pricing.js</div>
      ${highlight(PRICING_SRC)}
      ${buildPricingCFG()}
    </div>
  `;
}

// ── WebSocket subscriptions ───────────────────────────────────────────────
// fatigue_eval: highlight the branch that fired (time_based / sensor_based / null).
window.wsSubscribe('fatigue_eval', (msg) => {
  const key = msg.alertType || 'null';
  const ids  = F_PATHS[key] || F_PATHS['null'];
  glowFatiguePath(ids);
});

// surge_update: highlight zero_drivers or computed path.
window.wsSubscribe('surge_update', (msg) => {
  const ids = P_PATHS[msg.surgeType] || P_PATHS['computed'];
  glowPricingPath(ids);
});

// Render immediately — DOM is ready since this script loads after driver.js.
render();
