# QuizArena — Online Multiplayer Quiz & Competition Platform

Real-time multiplayer quiz platform.

## Structure
- `frontend/` — React + Vite + Tailwind + Socket.IO client
- `backend/`  — Node.js + Express + Socket.IO + MongoDB

## Quick Start

### Backend
```bash
cd backend
npm install
cp .env.example .env   # set MONGO_URI
npm run seed
npm run dev            # http://localhost:4000
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # http://localhost:8080
```

Optional: create `frontend/.env` with `VITE_SOCKET_URL=http://localhost:4000`.

## Features
- Guest nickname join
- Private room codes + public matchmaking
- Server-anchored synchronized timers
- Speed-weighted scoring
- Live leaderboard via WebSockets
- MongoDB persistence
