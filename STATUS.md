# STATUS.md — Grab Real-Time Demo Build Log

**Current phase: Phase 7 — COMPLETE**

---

| Phase | Title | Summary | Status |
|---|---|---|---|
| 1 | Backend skeleton | Express server on port 3000, WebSocket upgrade, `broadcast()` helper, `state.js` in-memory object, `simulator.js` fake sensor loop at 100 ms, `init` message on connect | Done |
| 2 | Fatigue + pricing logic | `evaluateFatigueAlert` in `fatigue.js` (verbatim per CLAUDE.md/report), 5 s eval loop + 1 s clock broadcast; `calculateSurgeMultiplier` in `pricing.js`, 30 s pricing loop; both loops scale with `speedMultiplier`; all demo_control actions handled in `index.js` | Done |
| 3 | Driver dashboard UI | Three-column HTML shell, driver ID + online pill, cumulative time (mm:ss), sensor ticker (rAF-throttled to ~10 Hz), risk score bar with threshold marker, alert banner (400 ms enter / 6 s hold / 600 ms exit), safety event log (FIFO 10 entries) | Done |
| 3.5 | Design system retrofit | `client/styles/tokens.css` with all Phase 3.5 tokens; `styles.css` imports tokens and uses only `var(--token)` references; Geist + JetBrains Mono fonts; tabular-nums on all live numbers; alert banner rebuilt per spec; anti-pattern list enforced | Done |
| 4 | Passenger app UI | `passenger.js` reuses shared WebSocket; surge multiplier (64px, animates on update); fare preview (5 km × RM 1.50/km × multiplier); 100 ms countdown from `nextUpdateAt`; inline SVG sparkline (last 20 multipliers); WS status dot polled every 500 ms; push latency badge | Done |
| 5 | Code panel + CFG | `code-panel.js` renders syntax-highlighted source for both functions; fatigue CFG (3 terminal paths) and pricing CFG (2 terminal paths) as inline SVGs; live path glow (1.5 s, `--brand` color) on `fatigue_eval` and `surge_update` messages | Done |
| 6 | Demo controls + polish | `demo-controls.js` builds the bottom control bar: Fast-forward +30 min, Spike Sensor Risk, Spike Demand, Speed 1×/5×/10× segmented toggle, Reset; all buttons send `demo_control` WebSocket messages; speed label in header updates on toggle; bar revealed on script load; entrance animations, button focus rings, alert banner layout-locked with `min-height` | Done |
| 7 | README + run instructions | `README.md` with project description, prerequisites table, Quick Start (bat + manual), input descriptions, demo controls reference, video script table, project structure, troubleshooting; `start.bat` one-click launcher with Node.js check, `npm install`, server start, and auto browser open | Done |
