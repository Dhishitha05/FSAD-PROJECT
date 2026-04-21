import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    choices: { type: [String], required: true, validate: (v) => v.length === 4 },
    correctIndex: { type: Number, required: true, min: 0, max: 3 },
    category: { type: String, default: "general" },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
  },
  { timestamps: true },
);

export const Question = mongoose.model("Question", QuestionSchema);
