// demo-controls.js — Phase 6: Demo control bar at the bottom of the page.
// Sends demo_control messages over the shared WebSocket opened by driver.js.
// These controls are for demo/presentation purposes only — not production features.

(function () {
  const bar = document.getElementById('controls-bar');
  if (!bar) return;

  // Reveal the bar (hidden by default until this script loads).
  bar.style.display = 'flex';

  // ── Speed state ──────────────────────────────────────────────────────────────
  let _speed = 1;

  function _setSpeed(s) {
    _speed = s;
    const lbl = document.getElementById('speed-label');
    if (lbl) lbl.textContent = `Speed: ${s}×`;
    document.querySelectorAll('.btn-speed').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed, 10) === s);
    });
  }

  // ── Send helper ──────────────────────────────────────────────────────────────
  function _send(action, value) {
    const sock = window.wsSocket;
    if (!sock || sock.readyState !== 1) {
      console.warn('[demo] WebSocket not open — cannot send', action);
      return;
    }
    const msg = { type: 'demo_control', action };
    if (value !== undefined) msg.value = value;
    sock.send(JSON.stringify(msg));
    console.log(`[demo] sent action=${action}`, value !== undefined ? `value=${value}` : '');
  }

  // ── Build the control bar ────────────────────────────────────────────────────
  bar.innerHTML = `
    <span class="controls-label">Demo Controls</span>

    <button class="btn" id="btn-ff"
      title="Advance cumulative trip time +30 min. Press 8 times to cross the 240-min fatigue threshold.">
      Fast-forward +30 min
    </button>

    <button class="btn" id="btn-spike-risk"
      title="Forces the next fatigue evaluation to see risk = 0.95, triggering the sensor branch.">
      Spike Sensor Risk
    </button>

    <button class="btn" id="btn-spike-demand"
      title="Forces the next pricing cycle to push multiplier = 2.8×, simulating a demand surge.">
      Spike Demand
    </button>

    <button class="btn" id="btn-force-zero-drivers"
      title="Pins availableDrivers to 0 for the next pricing cycle so calculateSurgeMultiplier runs its zero_drivers path (3.5× hard cap).">
      Force Zero Drivers
    </button>

    <span class="controls-label" style="margin-left:var(--space-3);">Speed</span>
    <button class="btn btn-speed active" data-speed="1"
      title="Normal speed — 5 s fatigue eval, 30 s price update">1×</button>
    <button class="btn btn-speed" data-speed="5"
      title="5× speed — 1 s fatigue eval, 6 s price update">5×</button>
    <button class="btn btn-speed" data-speed="10"
      title="10× speed — 500 ms fatigue eval, 3 s price update">10×</button>

    <button class="btn" id="btn-reset" style="margin-left:auto;"
      title="Reset all state to initial values and restart simulation loops.">
      Reset
    </button>
  `;

  // ── Button event listeners ───────────────────────────────────────────────────
  document.getElementById('btn-ff').addEventListener('click', () => {
    _send('fast_forward_time');
  });

  document.getElementById('btn-spike-risk').addEventListener('click', () => {
    _send('spike_risk');
  });

  document.getElementById('btn-spike-demand').addEventListener('click', () => {
    _send('spike_demand');
  });

  document.getElementById('btn-force-zero-drivers').addEventListener('click', () => {
    _send('force_zero_drivers');
  });

  document.querySelectorAll('.btn-speed').forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = parseInt(btn.dataset.speed, 10);
      _send('set_speed', s);
      _setSpeed(s);
    });
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    _send('reset');
    _setSpeed(1);
  });

  // ── Sync from init message ───────────────────────────────────────────────────
  // Server includes speedMultiplier in the init snapshot so reconnects stay in sync.
  window.wsSubscribe('init', (msg) => {
    if (msg.speedMultiplier != null) _setSpeed(msg.speedMultiplier);
  });
})();
