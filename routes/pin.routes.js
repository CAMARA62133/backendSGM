import express from "express";
import {
  pinMessage,
  unpinMessage,
  getPinnedMessages,
} from "../controllers/pinController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();
router.use(requireAuth);

// ✅ Mettre la route /conversation avant /:messageId
router.get("/conversation/:conversationId", getPinnedMessages);
router.post("/:messageId", pinMessage);
router.delete("/:messageId", unpinMessage);

export default router;
