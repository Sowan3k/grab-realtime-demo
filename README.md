# Grab Realtime Demo

A real-time engineering demo that adds two features to the Southeast Asian ride-hailing platform Grab: driver fatigue detection and dynamic surge pricing. Built for CSE443 Real-Time Software Engineering, Universiti Sains Malaysia.

**Live demo:** [grab-realtime-demo.onrender.com](https://grab-realtime-demo.onrender.com)

The demo runs on Render's free tier. The server sleeps after 15 minutes without traffic, so the first visit can take up to a minute to load. After that it runs in real time. All visitors share one in-memory simulation, so a control pressed by one person changes the screen for everyone. Press Reset to start clean.

## What it demonstrates

**Driver fatigue detection.** Accelerometer and gyroscope data stream from the driver app every 5 seconds. A server-side fatigue scoring engine evaluates risk. An alert fires within a 2-second hard deadline if cumulative trip time exceeds 240 minutes or sensor risk crosses 0.8.

**Dynamic surge pricing.** The multiplier recalculates every 30 seconds from the ratio of open ride requests to available drivers. Updates push to all clients over WebSocket. The passenger fare preview updates within 500 ms of a price change.

## Real-time guarantees

| Constraint | Value |
|---|---|
| Fatigue evaluation interval | 5 s |
| Fatigue alert deadline | 2 s |
| Surge update interval | 30 s |
| Surge push deadline | 500 ms |
| Fatigue time threshold | 240 min |
| Fatigue risk threshold | 0.8 |

The server measures end-to-end latency and each panel shows it inline, so you can check every deadline on screen.

## Stack

- Node.js, Express and ws (WebSocket)
- Vanilla HTML, CSS and JavaScript on the client
- In-memory state, no database, no auth

## Running locally

```
npm install
npm start
```

Then open http://localhost:3000. On Windows, double-click `start.bat` instead. It checks for Node.js, installs dependencies, starts the server and opens the browser.

The server listens on `PORT` when the variable is set and on 3000 otherwise. The client opens `wss://` when the page is served over HTTPS and `ws://` otherwise, so the same code runs locally and on a host.

## Deploying

The server holds an open WebSocket connection and runs timer loops in memory, so it needs a host that keeps a Node.js process running. Serverless platforms such as Vercel do not fit. The live demo uses a Render web service with these settings:

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm install` |
| Start command | `node server/index.js` |
| Instance type | Free |

Render sets `PORT` itself and serves the site over HTTPS. No environment variables are needed.

## Demo controls

The bottom control bar drives the 3-minute video demonstration.

- **Fast-forward +30 min:** adds 30 cumulative driving minutes per click. Eight clicks cross the 240-minute threshold.
- **Spike Sensor Risk:** forces the next sensor evaluation to risk 0.95 and triggers the sensor branch of the CFG.
- **Spike Demand:** forces the next surge multiplier to 2.8×.
- **Force Zero Drivers:** pins available drivers to 0 for the next pricing cycle, so `calculateSurgeMultiplier` runs its zero_drivers path and hits the 3.5× cap.
- **Speed (1× / 5× / 10×):** compresses the 30-second pricing cycle for video pacing.
- **Reset:** clears state.

## Project structure

```
server/
  index.js       Express + WebSocket entry
  state.js       In-memory state
  simulator.js   Sensor stream + demand fluctuation
  fatigue.js     evaluateFatigueAlert + 5s loop
  pricing.js     Surge multiplier + 30s loop
client/
  index.html
  styles.css
  styles/tokens.css
  driver.js      Left panel: fatigue dashboard
  passenger.js   Right panel: surge pricing
  code-panel.js  Center panel: source + CFG
  demo-controls.js
```

## Academic context

CSE443 Real-Time Software Engineering, Universiti Sains Malaysia (USM), Semester II 2025/2026. Group submission.

- Noor Mohammad Sowan (160235)
- Muhammad Fawwaz Rasyad (160642)
- Mohammad Haziq Surma (160800)
- Danish Raimi Bin Fazrul Edlin (164108)

## License

Academic demonstration project. Not for production use.
