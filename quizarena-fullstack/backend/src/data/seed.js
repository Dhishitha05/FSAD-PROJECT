import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { connectDB } from "../config/db.js";
import { Question } from "../models/Question.js";
import mongoose from "mongoose";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    console.error("Cannot seed: MongoDB not connected.");
    process.exit(1);
  }
  const raw = await readFile(path.join(__dirname, "sampleQuestions.json"), "utf8");
  const items = JSON.parse(raw);
  await Question.deleteMany({});
  await Question.insertMany(items);
  console.log(`✅ Seeded ${items.length} questions.`);
  await mongoose.disconnect();
};

run().catch((e) => { console.error(e); process.exit(1); });
