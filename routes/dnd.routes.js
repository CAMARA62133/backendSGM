import express from "express";
import {
  updateDNDSettings,
  getDNDSettings,
} from "../controllers/dndController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

router.use(requireAuth);

router.post("/settings", updateDNDSettings);
router.get("/settings/:conversationId", getDNDSettings);

export default router;
