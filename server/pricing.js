const state = require("./state");

const MAX_MULTIPLIER = 3.5;
const MIN_MULTIPLIER = 1.0;

// Zero-drivers path returns hard cap; normal path clamps supply/demand ratio.
function calculateSurgeMultiplier(openRequests, availableDrivers) {
  if (availableDrivers === 0) return MAX_MULTIPLIER;
  const raw = MIN_MULTIPLIER + 0.5 * (openRequests / availableDrivers);
  return Math.min(MAX_MULTIPLIER, Math.max(MIN_MULTIPLIER, raw));
}

let _pricingInterval = null;

function startPricingLoop(broadcast) {
  if (_pricingInterval) clearInterval(_pricingInterval);

  // 30 s update interval; scales with speedMultiplier for demo (30s → 6s → 3s).
  const updateIntervalMs = Math.round(30000 / state.speedMultiplier);

  function runCycle() {
    const t0 = Date.now();
    let multiplier;
    let surgeType;

    if (state.forceZeroDrivers) {
      // Force zero drivers demo control: pin availableDrivers to 0 for this one
      // cycle and run the REAL calculateSurgeMultiplier so the zero_drivers
      // terminal path genuinely executes (no forced-multiplier shortcut).
      state.forceZeroDrivers = false;
      state.availableDrivers = 0;
      multiplier = calculateSurgeMultiplier(state.openRequests, state.availableDrivers);
      surgeType  = state.availableDrivers === 0 ? "zero_drivers" : "computed";
    } else if (state.forcedNextMultiplier !== null) {
      // Spike demand demo control: use forced value directly, skip normal computation.
      multiplier = state.forcedNextMultiplier;
      state.forcedNextMultiplier = null;
      surgeType = "computed"; // treat spike as computed path for CFG highlighting
    } else {
      // Natural fluctuation: small random walk on open requests and driver count.
      state.openRequests     = Math.max(1, state.openRequests     + Math.round((Math.random() - 0.5) * 4));
      state.availableDrivers = Math.max(0, state.availableDrivers + Math.round((Math.random() - 0.5) * 2));
      multiplier = calculateSurgeMultiplier(state.openRequests, state.availableDrivers);
      surgeType  = state.availableDrivers === 0 ? "zero_drivers" : "computed";
    }

    state.currentMultiplier = +multiplier.toFixed(2);
    state.multiplierHistory.push(state.currentMultiplier);
    if (state.multiplierHistory.length > 20) state.multiplierHistory.shift();

    const pushLatencyMs = Date.now() - t0;
    const nextUpdateAt  = Date.now() + updateIntervalMs;

    console.log(
      `[pricing] surge_update zone=${state.zoneId} multiplier=${state.currentMultiplier}x ` +
      `surgeType=${surgeType} latency=${pushLatencyMs}ms ` +
      `openReq=${state.openRequests} drivers=${state.availableDrivers}`,
    );

    broadcast({
      type: "surge_update",
      zoneId: state.zoneId,
      multiplier: state.currentMultiplier,
      multiplierHistory: state.multiplierHistory,
      nextUpdateAt,
      pushLatencyMs,
      surgeType,
    });
  }

  _pricingInterval = setInterval(runCycle, updateIntervalMs);
  // Fire immediately so clients get a price on first connect without waiting 30 s.
  runCycle();
}

module.exports = { calculateSurgeMultiplier, startPricingLoop };
