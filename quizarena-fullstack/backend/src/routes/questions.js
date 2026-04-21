import { Router } from "express";
import { Question } from "../models/Question.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const items = await Question.find().lean();
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { prompt, choices, correctIndex, category, difficulty } = req.body;
    const q = await Question.create({ prompt, choices, correctIndex, category, difficulty });
    res.status(201).json(q);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);
    res.status(204).end();
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
