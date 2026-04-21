import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mongoose from "mongoose";
import { Question } from "../models/Question.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let fallbackCache = null;
async function loadFallback() {
  if (fallbackCache) return fallbackCache;
  const raw = await readFile(path.join(__dirname, "../data/sampleQuestions.json"), "utf8");
  fallbackCache = JSON.parse(raw);
  return fallbackCache;
}

export async function pickQuestions(n) {
  if (mongoose.connection.readyState === 1) {
    const docs = await Question.aggregate([{ $sample: { size: n } }]);
    if (docs.length) return docs.map((d) => ({
      prompt: d.prompt, choices: d.choices, correctIndex: d.correctIndex,
    }));
  }
  const all = await loadFallback();
  return [...all].sort(() => Math.random() - 0.5).slice(0, n);
}

const code = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export class LobbyManager {
  constructor(io) {
    this.io = io;
    this.lobbies = new Map();        // code -> Lobby
    this.socketLobby = new Map();    // socketId -> code
    this.publicCode = null;          // current open public lobby code
    this.publicAutostartTimer = null;
  }

  serialize(l) {
    return {
      code: l.code,
      isPublic: l.isPublic,
      hostId: l.hostId,
      players: l.players.map((p) => ({ id: p.id, nickname: p.nickname, score: p.score })),
    };
  }

  createLobby({ isPublic }) {
    let c = code();
    while (this.lobbies.has(c)) c = code();
    const lobby = {
      code: c, isPublic, hostId: null,
      players: [], readySet: new Set(),
      state: "waiting",            // waiting | playing | ended
      questions: [], qIndex: -1,
      answers: new Map(),          // socketId -> { choice, atMs }
      questionStartedAt: 0,
      durationMs: Number(process.env.QUESTION_DURATION_MS) || 15000,
      timers: {},
    };
    this.lobbies.set(c, lobby);
    return lobby;
  }

  joinByCode({ socket, nickname, code }) {
    const lobby = this.lobbies.get(code);
    if (!lobby) {
      const fresh = this.createLobby({ isPublic: false });
      // If user provided a code that doesn't exist, treat it as creating a new private room with auto-generated code
      return this._addPlayer({ socket, nickname, lobby: fresh });
    }
    if (lobby.state !== "waiting") return { ok: false, error: "Game already in progress" };
    return this._addPlayer({ socket, nickname, lobby });
  }

  joinPublic({ socket, nickname }) {
    let lobby = this.publicCode ? this.lobbies.get(this.publicCode) : null;
    if (!lobby || lobby.state !== "waiting") {
      lobby = this.createLobby({ isPublic: true });
      this.publicCode = lobby.code;
    }
    const result = this._addPlayer({ socket, nickname, lobby });
    if (result.ok) this._maybeAutostart(lobby);
    return result;
  }

  _addPlayer({ socket, nickname, lobby }) {
    if (lobby.players.length >= 16) return { ok: false, error: "Lobby full" };
    const player = { id: socket.id, nickname, score: 0 };
    lobby.players.push(player);
    if (!lobby.hostId) lobby.hostId = socket.id;
    this.socketLobby.set(socket.id, lobby.code);
    socket.join(lobby.code);
    this._broadcastLobby(lobby);
    return { ok: true, player, lobby: this.serialize(lobby) };
  }

  leave(socket) {
    const code = this.socketLobby.get(socket.id);
    if (!code) return;
    const lobby = this.lobbies.get(code);
    this.socketLobby.delete(socket.id);
    if (!lobby) return;
    lobby.players = lobby.players.filter((p) => p.id !== socket.id);
    lobby.readySet.delete(socket.id);
    socket.leave(code);
    if (lobby.players.length === 0) {
      this._cleanup(lobby);
      return;
    }
    if (lobby.hostId === socket.id) lobby.hostId = lobby.players[0].id;
    this._broadcastLobby(lobby);
  }

  ready(socket, gameLoop) {
    const code = this.socketLobby.get(socket.id);
    const lobby = code && this.lobbies.get(code);
    if (!lobby || lobby.state !== "waiting") return;
    // For private rooms: only host start triggers; for public: any ready triggers autostart
    if (!lobby.isPublic) {
      if (socket.id === lobby.hostId) gameLoop.start(lobby);
    } else {
      lobby.readySet.add(socket.id);
      if (lobby.readySet.size >= Math.max(2, lobby.players.length)) {
        gameLoop.start(lobby);
      }
    }
  }

  recordAnswer(socket, choice) {
    const code = this.socketLobby.get(socket.id);
    const lobby = code && this.lobbies.get(code);
    if (!lobby || lobby.state !== "playing") return;
    if (lobby.answers.has(socket.id)) return;
    lobby.answers.set(socket.id, { choice, atMs: Date.now() });
  }

  _maybeAutostart(lobby) {
    const min = Number(process.env.PUBLIC_LOBBY_AUTOSTART_PLAYERS) || 3;
    const delay = Number(process.env.PUBLIC_LOBBY_AUTOSTART_DELAY_MS) || 8000;
    if (lobby.players.length >= min && !this.publicAutostartTimer) {
      this.publicAutostartTimer = setTimeout(() => {
        this.publicAutostartTimer = null;
        this._pendingAutostart?.(lobby);
      }, delay);
    }
  }

  _broadcastLobby(lobby) {
    this.io.to(lobby.code).emit("lobby:update", this.serialize(lobby));
  }

  _cleanup(lobby) {
    Object.values(lobby.timers).forEach(clearTimeout);
    if (this.publicCode === lobby.code) this.publicCode = null;
    this.lobbies.delete(lobby.code);
  }
}
