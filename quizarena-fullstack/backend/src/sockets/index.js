import { LobbyManager } from "./lobbyManager.js";
import { GameLoop } from "./gameLoop.js";

export function registerSocketHandlers(io) {
  const lm = new LobbyManager(io);
  const gl = new GameLoop(io, lm);
  // Wire deferred autostart
  lm._pendingAutostart = (lobby) => gl.start(lobby);

  io.on("connection", (socket) => {
    console.log(`+ ${socket.id} connected`);

    socket.on("lobby:join-code", ({ nickname, code }, ack) => {
      if (!nickname || typeof nickname !== "string") return ack?.({ ok: false, error: "Nickname required" });
      const result = lm.joinByCode({ socket, nickname: nickname.slice(0, 16), code: (code || "").toUpperCase() });
      ack?.(result);
    });

    socket.on("lobby:join-public", ({ nickname }, ack) => {
      if (!nickname || typeof nickname !== "string") return ack?.({ ok: false, error: "Nickname required" });
      const result = lm.joinPublic({ socket, nickname: nickname.slice(0, 16) });
      ack?.(result);
    });

    socket.on("lobby:ready", () => lm.ready(socket, gl));
    socket.on("lobby:leave", () => lm.leave(socket));
    socket.on("game:answer", ({ choice }) => {
      if (typeof choice === "number") lm.recordAnswer(socket, choice);
    });

    socket.on("disconnect", () => {
      console.log(`- ${socket.id} disconnected`);
      lm.leave(socket);
    });
  });
}
