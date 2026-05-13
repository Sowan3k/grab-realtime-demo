# Grab Realtime Demo

A real-time engineering demo enhancing Southeast Asian ride-hailing platform Grab with two new features: driver fatigue detection and dynamic surge pricing. Built for CSE443 Real-Time Software Engineering, Universiti Sains Malaysia.

**Demo video:** _(to be added after upload)_

## What it demonstrates

**Driver fatigue detection.** Accelerometer and gyroscope data stream from the driver app every 5 seconds. A server-side fatigue scoring engine evaluates risk. An alert fires within a 2-second hard deadline if cumulative trip time exceeds 240 minutes or sensor risk crosses 0.8.

**Dynamic surge pricing.** Multiplier recalculates every 30 seconds based on the ratio of open ride requests to available drivers. Updates push to all clients via WebSocket. Passenger fare preview updates within 500 ms of price change.

## Real-time guarantees

| Constraint | Value |
|---|---|
| Fatigue evaluation interval | 5 s |
| Fatigue alert deadline | 2 s |
| Surge update interval | 30 s |
| Surge push deadline | 500 ms |
| Fatigue time threshold | 240 min |
| Fatigue risk threshold | 0.8 |

End-to-end latency is measured at the server and displayed inline on each panel so you can verify deadlines visually.

## Stack

- Node.js + Express + ws (WebSocket)
- Vanilla HTML / CSS / JavaScript on the client
- In-memory state, no database, no auth

## Running

```
npm install
npm start
```

Then open http://localhost:3000.

## Demo controls

The bottom control bar is for the 3-minute video demonstration:

- **Fast-forward time** — adds 30 cumulative driving minutes per click
- **Spike sensor risk** — forces the next sensor evaluation to risk 0.95 (triggers sensor branch of CFG)
- **Spike demand** — forces the next surge multiplier to 2.8×
- **Speed (1× / 5× / 10×)** — compresses the 30-second pricing cycle for video pacing
- **Reset** — clears state

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
  driver.js      Left panel — fatigue dashboard
  passenger.js   Right panel — surge pricing
  code-panel.js  Center panel — source + CFG
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
