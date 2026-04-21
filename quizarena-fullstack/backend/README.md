# QuizArena Backend

Real-time multiplayer quiz server using **Express + Socket.IO + MongoDB**.
Pairs with the QuizArena Lovable frontend.

## Quick start

```bash
cp .env.example .env          # edit MONGODB_URI if needed
npm install
npm run seed                  # loads sample questions into MongoDB
npm run dev                   # starts on http://localhost:4000
```

Then point the frontend at it by setting `VITE_SOCKET_URL=http://localhost:4000`
in the Lovable project (or just run the frontend with the default — it already
points to `http://localhost:4000`).

## Architecture

```
src/
├── server.js               # express + http + socket.io bootstrap
├── config/db.js            # mongoose connection
├── models/
│   ├── Question.js         # quiz question schema (NoSQL)
│   └── GameResult.js       # persisted final leaderboards
├── routes/
│   ├── health.js           # GET /api/health
│   └── questions.js        # CRUD-lite REST for questions
├── sockets/
│   ├── index.js            # io.on('connection') wiring
│   ├── lobbyManager.js     # in-memory rooms + matchmaking
│   └── gameLoop.js         # synchronized question/timer/scoring loop
└── data/
    ├── sampleQuestions.json
    └── seed.js
```

## Socket.IO contract

**Client → Server**
- `lobby:join-code` `{ nickname, code? }` → `(ack)` joins or creates a private room
- `lobby:join-public` `{ nickname }` → `(ack)` joins the public matchmaking lobby
- `lobby:ready` — flag yourself ready (host start in private rooms)
- `lobby:leave`
- `game:answer` `{ choice: number }`

**Server → Client**
- `lobby:update` `Lobby`
- `game:question` `{ index, total, prompt, choices, durationMs, startedAt }`
- `game:round-result` `{ correctIndex, leaderboard }`
- `game:over` `{ leaderboard }`
- `error:msg` `string`

Timers are **server-anchored**: `startedAt` is `Date.now()` on the server, so
clients can compute remaining time without drift.

## REST endpoints

- `GET /api/health` → `{ ok: true }`
- `GET /api/questions` → list all questions
- `POST /api/questions` → create one (`{ prompt, choices, correctIndex, category? }`)
- `DELETE /api/questions/:id`
