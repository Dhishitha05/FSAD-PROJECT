import { Router } from "express";
const router = Router();
router.get("/", (_req, res) => res.json({ ok: true, service: "quizarena", time: Date.now() }));
export default router;
