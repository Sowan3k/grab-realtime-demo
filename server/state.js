// Single in-memory state for the entire demo session — resets on server restart.
const state = {
  driverId: "DRV-001",
  cumulativeMin: 0,
  lastSensorRisk: 0,
  forcedNextRisk: null,        // set by demo "spike risk" button
  forcedNextMultiplier: null,  // set by demo "spike demand" button
  zoneId: "PEN-CENTRAL",
  currentMultiplier: 1.0,
  multiplierHistory: [],       // last 20 multipliers
  openRequests: 12,
  availableDrivers: 18,
  speedMultiplier: 1,          // 1 / 5 / 10
  startedAt: Date.now(),
};

module.exports = state;
