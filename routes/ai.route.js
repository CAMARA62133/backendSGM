import express from "express";
import { askAI, askAIInput } from "../controllers/aiController.js";

const router = express.Router();

// Définition de la route POST
router.post("/", askAI);
router.post("/ask-ai-input", askAIInput);

export default router;
