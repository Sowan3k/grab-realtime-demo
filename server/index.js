const express   = require("express");
const http      = require("http");
const path      = require("path");
const WebSocket = require("ws");
const state     = require("./state");
const { startSimulator }   = require("./simulator");
const { startFatigueLoop } = require("./fatigue");
const { startPricingLoop } = require("./pricing");

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

// Serve the client folder at the root URL.
app.use(express.static(path.join(__dirname, "../client")));

// Broadcast a message object to all connected WebSocket clients.
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Snapshot of current state sent to each new client on connect.
function buildInitMessage() {
  return {
    type: "init",
    driverId: state.driverId,
    cumulativeMin: state.cumulativeMin,
    lastSensorRisk: state.lastSensorRisk,
    zoneId: state.zoneId,
    currentMultiplier: state.currentMultiplier,
    multiplierHistory: state.multiplierHistory,
    speedMultiplier: state.speedMultiplier,
  };
}

wss.on("connection", (ws) => {
  console.log("[ws] client connected — total:", wss.clients.size);

  // Push current state immediately so the UI doesn't render empty on load.
  ws.send(JSON.stringify(buildInitMessage()));

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type !== "demo_control") return;

    const { action, value } = msg;
    console.log(`[demo] action=${action}`, value !== undefined ? `value=${value}` : "");

    switch (action) {
      case "fast_forward_time":
        // Jump trip time forward 30 min per click — reaches 240-min threshold in ~8 clicks.
        state.cumulativeMin += 30;
        console.log(`[demo] cumulativeMin → ${state.cumulativeMin.toFixed(2)} min`);
        break;

      case "spike_risk":
        // Force next fatigue eval to see risk = 0.95 (above the 0.8 threshold).
        // Set lastSensorRisk immediately so the eval loop sees it even if the
        // 100 ms sensor tick fires before the eval and would overwrite it.
        state.forcedNextRisk = 0.95;
        state.lastSensorRisk = 0.95;
        console.log("[demo] forcedNextRisk = 0.95 — sensor alert will fire on next eval");
        break;

      case "spike_demand":
        state.forcedNextMultiplier = 2.8;
        console.log("[demo] forcedNextMultiplier = 2.8");
        break;

      case "force_zero_drivers":
        // Pin availableDrivers to 0 for the next pricing cycle so the real
        // calculateSurgeMultiplier runs its zero_drivers terminal path on camera.
        state.forceZeroDrivers = true;
        console.log("[demo] forceZeroDrivers = true — next cycle pins drivers to 0");
        break;

      case "set_speed":
        state.speedMultiplier = value;
        console.log(`[demo] speedMultiplier = ${value}x — restarting eval and pricing loops`);
        startFatigueLoop(broadcast);
        startPricingLoop(broadcast);
        break;

      case "reset":
        state.cumulativeMin        = 0;
        state.lastSensorRisk       = 0;
        state.forcedNextRisk       = null;
        state.forcedNextMultiplier = null;
        state.forceZeroDrivers     = false;
        state.currentMultiplier    = 1.0;
        state.multiplierHistory    = [];
        state.openRequests         = 12;
        state.availableDrivers     = 18;
        state.speedMultiplier      = 1;
        state.startedAt            = Date.now();
        console.log("[demo] state reset — restarting loops");
        startFatigueLoop(broadcast);
        startPricingLoop(broadcast);
        broadcast(buildInitMessage());
        break;

      default:
        console.warn("[demo] unknown action:", action);
    }
  });

  ws.on("close", () => {
    console.log("[ws] client disconnected — total:", wss.clients.size);
  });

  ws.on("error", (err) => {
    console.error("[ws] error:", err.message);
  });
});

// Start all simulation loops.
startSimulator(broadcast);
startFatigueLoop(broadcast);
startPricingLoop(broadcast);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}`);
});
