import mongoose from "mongoose";
import { GameResult } from "../models/GameResult.js";
import { pickQuestions } from "./lobbyManager.js";

const QUESTIONS_PER_GAME = Number(process.env.QUESTIONS_PER_GAME) || 8;
const INTER_ROUND_DELAY_MS = Number(process.env.INTER_ROUND_DELAY_MS) || 4000;

export class GameLoop {
  constructor(io, lobbyManager) {
    this.io = io;
    this.lm = lobbyManager;
  }

  async start(lobby) {
    if (lobby.state !== "waiting") return;
    lobby.state = "playing";
    lobby.questions = await pickQuestions(QUESTIONS_PER_GAME);
    lobby.qIndex = -1;
    lobby.players.forEach((p) => (p.score = 0));
    this._nextQuestion(lobby);
  }

  _nextQuestion(lobby) {
    lobby.qIndex += 1;
    if (lobby.qIndex >= lobby.questions.length) return this._end(lobby);

    const q = lobby.questions[lobby.qIndex];
    lobby.answers.clear();
    lobby.questionStartedAt = Date.now();

    this.io.to(lobby.code).emit("game:question", {
      index: lobby.qIndex,
      total: lobby.questions.length,
      prompt: q.prompt,
      choices: q.choices,
      durationMs: lobby.durationMs,
      startedAt: lobby.questionStartedAt,
    });

    lobby.timers.round = setTimeout(() => this._scoreRound(lobby), lobby.durationMs + 250);
  }

  _scoreRound(lobby) {
    const q = lobby.questions[lobby.qIndex];
    // Speed-weighted scoring: 1000 base if correct, +up to 500 for speed
    for (const player of lobby.players) {
      const ans = lobby.answers.get(player.id);
      if (!ans) continue;
      if (ans.choice === q.correctIndex) {
        const elapsed = ans.atMs - lobby.questionStartedAt;
        const speedBonus = Math.max(0, Math.round(500 * (1 - elapsed / lobby.durationMs)));
        player.score += 1000 + speedBonus;
      }
    }
    const leaderboard = [...lobby.players].sort((a, b) => b.score - a.score);
    this.io.to(lobby.code).emit("game:round-result", {
      correctIndex: q.correctIndex,
      leaderboard,
    });
    lobby.timers.next = setTimeout(() => this._nextQuestion(lobby), INTER_ROUND_DELAY_MS);
  }

  async _end(lobby) {
    lobby.state = "ended";
    const leaderboard = [...lobby.players].sort((a, b) => b.score - a.score);
    this.io.to(lobby.code).emit("game:over", { leaderboard });

    if (mongoose.connection.readyState === 1) {
      try {
        await GameResult.create({
          roomCode: lobby.code,
          isPublic: lobby.isPublic,
          leaderboard: leaderboard.map((p) => ({ nickname: p.nickname, score: p.score })),
          questionCount: lobby.questions.length,
        });
      } catch (e) {
        console.warn("Could not persist GameResult:", e.message);
      }
    }
    // Reset for replay
    lobby.state = "waiting";
    lobby.qIndex = -1;
    lobby.answers.clear();
    lobby.readySet.clear();
  }
}
