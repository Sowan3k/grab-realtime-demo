const state = require("./state");

// Module-scoped broadcast reference; injected by startFatigueLoop — avoids a true global.
let _broadcast = null;

// Tracks which alert branch fired during the current evaluateFatigueAlert call.
let _lastAlertType = null;

function pushAlert(driverId, type) {
  _lastAlertType = type;
  console.log(`[fatigue] ALERT driverId=${driverId} type=${type}`);
}

function logSafetyEvent(driverId, eventCode) {
  console.log(`[fatigue] SAFETY_EVENT driverId=${driverId} event=${eventCode}`);
}

// Must match server/fatigue.js exactly — report Section 3 CFG depends on this shape.
function evaluateFatigueAlert(driverId, cumulativeMin, sensorRisk) {
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
}

let _fatigueInterval = null;
let _clockInterval = null;

function startFatigueLoop(broadcast) {
  _broadcast = broadcast;

  // Clear existing loops so restarts (speed changes) don't double-fire.
  if (_fatigueInterval) clearInterval(_fatigueInterval);
  if (_clockInterval)   clearInterval(_clockInterval);

  // 1-second clock: advance cumulative trip time and broadcast for smooth dashboard display.
  _clockInterval = setInterval(() => {
    state.cumulativeMin += 1 / 60; // one real second = 1/60 of a minute
    broadcast({
      type: "cumulative_time",
      driverId: state.driverId,
      minutes: +state.cumulativeMin.toFixed(4),
    });
  }, 1000);

  // Fatigue evaluation loop — 5 s deadline; scales with speedMultiplier for demo.
  const evalIntervalMs = Math.round(5000 / state.speedMultiplier);
  _fatigueInterval = setInterval(() => {
    const t0 = Date.now();
    _lastAlertType = null;
    const alert = evaluateFatigueAlert(
      state.driverId,
      state.cumulativeMin,
      state.lastSensorRisk,
    );
    const latencyMs = Date.now() - t0;
    console.log(
      `[fatigue] eval risk=${state.lastSensorRisk.toFixed(4)} ` +
      `cumMin=${state.cumulativeMin.toFixed(2)} alert=${alert} ` +
      `alertType=${_lastAlertType} latency=${latencyMs}ms`,
    );
    broadcast({
      type: "fatigue_eval",
      driverId: state.driverId,
      risk: +state.lastSensorRisk.toFixed(4),
      alert,
      alertType: _lastAlertType,   // "time_based" | "sensor_based" | null
      latencyMs,
    });
  }, evalIntervalMs);
}

module.exports = { evaluateFatigueAlert, pushAlert, logSafetyEvent, startFatigueLoop };
