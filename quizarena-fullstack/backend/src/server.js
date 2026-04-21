import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { connectDB } from "./config/db.js";
import healthRouter from "./routes/health.js";
import questionsRouter from "./routes/questions.js";
import { registerSocketHandlers } from "./sockets/index.js";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || "*";

const app = express();
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());

app.use("/api/health", healthRouter);
app.use("/api/questions", questionsRouter);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ORIGIN, methods: ["GET", "POST"] },
});

registerSocketHandlers(io);

await connectDB();

server.listen(PORT, () => {
  console.log(`🎯 QuizArena backend listening on http://localhost:${PORT}`);
  console.log(`   Socket.IO ready · CORS origin: ${ORIGIN}`);
});
