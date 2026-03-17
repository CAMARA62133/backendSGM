import express from "express";
import {
  markAsRead,
  getMessageReadReceipts,
} from "../controllers/readReceiptController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();
router.use(requireAuth);

router.post("/:messageId", markAsRead);
router.get("/:messageId", getMessageReadReceipts);

export default router;
