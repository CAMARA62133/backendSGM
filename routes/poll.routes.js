import express from "express";
import {
  createPoll,
  votePoll,
  getPollResults,
} from "../controllers/pollController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();
router.use(requireAuth);

router.post("/", createPoll);
router.post("/:pollId/vote", votePoll);
router.get("/:pollId", getPollResults);

export default router;
