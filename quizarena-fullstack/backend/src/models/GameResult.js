import mongoose from "mongoose";

const GameResultSchema = new mongoose.Schema(
  {
    roomCode: String,
    isPublic: Boolean,
    leaderboard: [{ nickname: String, score: Number }],
    questionCount: Number,
  },
  { timestamps: true },
);

export const GameResult = mongoose.model("GameResult", GameResultSchema);
