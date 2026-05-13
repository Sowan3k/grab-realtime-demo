const state = require("./state");

// Sensor axes persist between ticks so readings random-walk rather than jump.
let ax = 0, ay = 0, az = 0;
let gx = 0, gy = 0, gz = 0;

function randomWalk(current, step = 0.05, min = -2, max = 2) {
  const next = current + (Math.random() - 0.5) * 2 * step;
  return Math.max(min, Math.min(max, next));
}

function computeRisk(ax, ay, az, gx, gy, gz) {
  const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
  const gyroMag  = Math.sqrt(gx * gx + gy * gy + gz * gz);
  // Keep normal risk roughly in 0.1–0.55 range so it stays below the 0.8 threshold
  // unless forcedNextRisk is used.
  const raw = 0.05 + accelMag * 0.12 + gyroMag * 0.006 + (Math.random() * 0.08);
  return Math.min(1.0, Math.max(0.0, raw));
}

function startSimulator(broadcast) {
  // 100 ms sensor tick — not affected by speedMultiplier; only eval/pricing loops scale.
  setInterval(() => {
    ax = randomWalk(ax, 0.08, -2, 2);
    ay = randomWalk(ay, 0.08, -2, 2);
    az = randomWalk(az, 0.08, -2, 2);
    gx = randomWalk(gx, 2.0, -50, 50);
    gy = randomWalk(gy, 2.0, -50, 50);
    gz = randomWalk(gz, 2.0, -50, 50);

    // Honor forcedNextRisk once, then clear it.
    if (state.forcedNextRisk !== null) {
      state.lastSensorRisk = state.forcedNextRisk;
      state.forcedNextRisk = null;
    } else {
      state.lastSensorRisk = computeRisk(ax, ay, az, gx, gy, gz);
    }

    broadcast({
      type: "sensor_reading",
      driverId: state.driverId,
      accel: { x: +ax.toFixed(3), y: +ay.toFixed(3), z: +az.toFixed(3) },
      gyro:  { x: +gx.toFixed(2), y: +gy.toFixed(2), z: +gz.toFixed(2) },
      risk: +state.lastSensorRisk.toFixed(4),
      t: Date.now(),
    });
  }, 100);
}

module.exports = { startSimulator };
