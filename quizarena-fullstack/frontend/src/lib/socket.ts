import { io, Socket } from "socket.io-client";

// Point this at your local backend (see /mnt/documents backend bundle).
// Override at build time with VITE_SOCKET_URL.
const URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(URL, {
      autoConnect: true,
      transports: ["websocket"],
    });
  }
  return socket;
}

export type Player = { id: string; nickname: string; score: number };
export type Question = {
  index: number;
  total: number;
  prompt: string;
  choices: string[];
  durationMs: number;
  startedAt: number;
};
export type RoundResult = {
  correctIndex: number;
  leaderboard: Player[];
};
export type GameOver = { leaderboard: Player[] };
