// ── Shared WebSocket ───────────────────────────────────────────────────────
// One connection for the entire page; other modules attach via window.wsSubscribe.
const wsScheme = location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsScheme}://${location.host}`);

const _handlers = {};

// subscribe(type, fn) — called by this module and future passenger/code-panel modules.
function subscribe(type, handler) {
  if (!_handlers[type]) _handlers[type] = [];
  _handlers[type].push(handler);
}

socket.addEventListener("message", (event) => {
  let msg;
  try { msg = JSON.parse(event.data); } catch { return; }
  (_handlers[msg.type] || []).forEach((h) => h(msg));
});

function _updateConnectionDot(connected) {
  const dot   = document.getElementById("header-ws-dot");
  const label = document.getElementById("header-ws-label");
  if (!dot || !label) return;
  if (connected) {
    dot.classList.add("connected");
    label.textContent = "CONNECTED";
  } else {
    dot.classList.remove("connected");
    label.textContent = "DISCONNECTED";
  }
}

socket.addEventListener("open",  () => { console.log("[ws] connected");    _updateConnectionDot(true);  });
socket.addEventListener("close", () => { console.log("[ws] disconnected"); _updateConnectionDot(false); });
socket.addEventListener("error", (e) => console.error("[ws] socket error", e));

// Expose globally so Phase 4–6 modules can reuse the same connection.
window.wsSubscribe = subscribe;
window.wsSocket    = socket;

// ── Sensor ticker ──────────────────────────────────────────────────────────
// Server sends sensor_reading at 100 Hz. We buffer the latest value and paint
// at most once per animation frame (~60 fps), capping DOM work to ~10 Hz effectively.
let _latestSensor = null;
let _rafPending   = false;

function _paintSensor() {
  _rafPending = false;
  if (!_latestSensor) return;
  const s = _latestSensor;
  document.getElementById("accel-x").textContent = s.accel.x.toFixed(3);
  document.getElementById("accel-y").textContent = s.accel.y.toFixed(3);
  document.getElementById("accel-z").textContent = s.accel.z.toFixed(3);
  document.getElementById("gyro-x").textContent  = s.gyro.x.toFixed(2);
  document.getElementById("gyro-y").textContent  = s.gyro.y.toFixed(2);
  document.getElementById("gyro-z").textContent  = s.gyro.z.toFixed(2);
  // Risk is included in sensor_reading so the bar updates at sensor cadence.
  _updateRiskBar(s.risk);
}

subscribe("sensor_reading", (msg) => {
  _latestSensor = msg;
  if (!_rafPending) {
    _rafPending = true;
    requestAnimationFrame(_paintSensor);
  }
});

// ── Cumulative time display ────────────────────────────────────────────────
// Drives off 1-second cumulative_time broadcasts; shows mm:ss in JetBrains Mono.
function _renderTime(minutes) {
  const mm = Math.floor(minutes);
  const ss = Math.floor((minutes - mm) * 60);
  document.getElementById("cum-time").textContent =
    `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

subscribe("cumulative_time", (msg) => _renderTime(msg.minutes));

// ── Risk score bar ─────────────────────────────────────────────────────────
// Threshold 0.8 is marked in HTML; color: green < 0.5, amber < 0.8, red ≥ 0.8.
function _updateRiskBar(risk) {
  const fill = document.getElementById("risk-fill");
  fill.style.width = `${Math.min(risk * 100, 100)}%`;
  fill.className = "risk-fill " +
    (risk >= 0.8 ? "risk-high" : risk >= 0.5 ? "risk-mid" : "risk-low");
  document.getElementById("risk-value").textContent = risk.toFixed(4);
}

// ── Alert banner ───────────────────────────────────────────────────────────
// Hidden by default. Fires on fatigue_eval with alert === true.
// Timing per Phase 3.5 spec: 400ms enter, 6s hold, 600ms exit.
let _bannerT1 = null;   // entering → active
let _bannerT2 = null;   // active → fading
let _bannerT3 = null;   // fading → hidden

function _showAlertBanner(msg) {
  const banner      = document.getElementById("alert-banner");
  const content     = document.getElementById("alert-content");
  const placeholder = document.getElementById("alert-placeholder");
  const typeLabel   = msg.alertType === "time_based"
    ? "CUMULATIVE TIME EXCEEDED"
    : "SENSOR RISK EXCEEDED";

  document.getElementById("alert-text").textContent =
    `DROWSINESS DETECTED — ${typeLabel}`;
  document.getElementById("alert-latency").textContent =
    `Alert delivered in ${msg.latencyMs} ms  |  deadline: 2000 ms`;

  placeholder.style.display = "none";
  content.style.display     = "grid";

  // Clear any in-progress timers so re-fires restart cleanly.
  [_bannerT1, _bannerT2, _bannerT3].forEach((t) => t && clearTimeout(t));

  // Phase 1: 400ms slide-down + fade-in
  banner.className = "alert-banner entering";

  // Phase 2: hold with border pulse for 6s
  _bannerT1 = setTimeout(() => {
    banner.className = "alert-banner active";

    // Phase 3: 600ms fade-out
    _bannerT2 = setTimeout(() => {
      banner.className = "alert-banner fading";

      // Restore dormant state after exit animation completes
      _bannerT3 = setTimeout(() => {
        banner.className      = "alert-banner hidden";
        content.style.display = "none";
        placeholder.style.display = "block";
      }, 600);
    }, 6000);
  }, 400);
}

// ── Safety event log ───────────────────────────────────────────────────────
// Prepend each alert as a timestamped line; cap at 10 entries (FIFO from top).
const MAX_LOG = 10;
let _firstLog  = true;

function _addLogEntry(msg) {
  const log = document.getElementById("event-log");

  // Remove the placeholder "Waiting…" on first real event.
  if (_firstLog) {
    log.innerHTML = "";
    _firstLog = false;
  }

  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, "0");
  const mm  = String(now.getMinutes()).padStart(2, "0");
  const ss  = String(now.getSeconds()).padStart(2, "0");
  const code = msg.alertType === "time_based" ? "FATIGUE_TIME" : "FATIGUE_SENSOR";

  const entry = document.createElement("div");
  entry.className = "log-entry alert";
  entry.textContent = `[${hh}:${mm}:${ss}] ${code} — alert delivered in ${msg.latencyMs}ms`;
  log.prepend(entry);

  // Keep at most 10 entries.
  while (log.children.length > MAX_LOG) log.removeChild(log.lastChild);
}

// ── fatigue_eval ───────────────────────────────────────────────────────────
subscribe("fatigue_eval", (msg) => {
  // Always update risk bar from eval too (belt-and-suspenders for the video).
  _updateRiskBar(msg.risk);
  if (msg.alert) {
    _showAlertBanner(msg);
    _addLogEntry(msg);
  }
});

// ── init — pre-populate before first sensor tick arrives ───────────────────
subscribe("init", (msg) => {
  document.getElementById("driver-id").textContent = msg.driverId;
  _renderTime(msg.cumulativeMin);
  _updateRiskBar(msg.lastSensorRisk);
});
