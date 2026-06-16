// Single in-memory state for the entire demo session — resets on server restart.
const state = {
  driverId: "DRV-001",
  cumulativeMin: 0,
  lastSensorRisk: 0,
  forcedNextRisk: null,        // set by demo "spike risk" button
  forcedNextMultiplier: null,  // set by demo "spike demand" button
  forceZeroDrivers: false,     // set by demo "force zero drivers" button — pins drivers to 0 for one cycle
  zoneId: "PEN-CENTRAL",
  currentMultiplier: 1.0,
  multiplierHistory: [],       // last 20 multipliers
  openRequests: 12,
  availableDrivers: 18,
  speedMultiplier: 1,          // 1 / 5 / 10
  startedAt: Date.now(),
};

module.exports = state;
