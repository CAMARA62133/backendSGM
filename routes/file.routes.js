import express from "express";
import {
  uploadFile,
  getConversationFiles,
  downloadFile,
} from "../controllers/fileController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import uploadChat from "../middlewares/uploads.js";

const router = express.Router();

router.use(requireAuth);

// ✅ l’ordre est important pour ne pas créer de conflit
router.post("/upload", uploadChat.single("file"), uploadFile);
router.get("/conversation/:conversationId", getConversationFiles);
router.get("/download/:fileId", downloadFile);

export default router;
