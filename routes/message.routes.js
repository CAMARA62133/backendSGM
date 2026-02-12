// =========================
// routes/message.route.js
// =========================

import express from "express";
import upload from "../middlewares/uploads.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

import {
  envoyerMessage,
  getMessagesRecus,
  getMessagesEnvoyes,
  getBrouillons,
  getFavoris,
  getMessagesArchives,
  getMessage,
  getAllMessages,
  getConversation,
  toggleArchiveMessage,
  toggleFavori,
  marquerTousLus,
  marquerCommeLu,
  supprimerMessage,
  restaurerMessage,
  supprimerDefinitivement,
  viderCorbeille,
  getCorbeille,
  nombreMessagesNonLus,
  nombreBrouillons,
  nombreMessagesArchives,
  nombreMessagesCorbeille,
  nombreMessagesFavoris,
} from "../controllers/messageController.js";

const router = express.Router();

// =========================
// 📈 STATISTIQUES
// =========================

router.get("/count/unread", requireAuth, nombreMessagesNonLus);
router.get("/count/drafts", requireAuth, nombreBrouillons);
router.get("/count/archived", requireAuth, nombreMessagesArchives);
router.get("/count/trash", requireAuth, nombreMessagesCorbeille);
router.get("/count/favori", requireAuth, nombreMessagesFavoris);

// =========================
// 🗂️ ROUTES DE MESSAGES PAR DOSSIERS
// =========================

router.get("/", requireAuth, getAllMessages);
router.get("/recus", requireAuth, getMessagesRecus);
router.get("/envoyes", requireAuth, getMessagesEnvoyes);
router.get("/brouillons", requireAuth, getBrouillons);
router.get("/favoris", requireAuth, getFavoris);
router.get("/archives", requireAuth, getMessagesArchives);
router.get("/corbeille", requireAuth, getCorbeille);
router.get("/conversation/:threadId", requireAuth, getConversation);

// =========================
// ⚙️ ACTIONS GÉNÉRALES
// =========================

router.put("/marquer-lus", requireAuth, marquerTousLus);
router.delete("/corbeille", requireAuth, viderCorbeille);

// =========================
// 📧 ENVOI DE MESSAGE
// =========================

router.post("/", requireAuth, upload.array("piecesJointes", 5), envoyerMessage);

// =========================
// 🆔 ROUTES DYNAMIQUES
// =========================

router.put("/:id/lu", requireAuth, marquerCommeLu);
router.put("/:id/archive", requireAuth, toggleArchiveMessage);
router.put("/:id/favori", requireAuth, toggleFavori);
router.put("/:id/supprimer", requireAuth, supprimerMessage);
router.put("/:id/restaurer", requireAuth, restaurerMessage);
router.delete("/:id", requireAuth, supprimerDefinitivement);
router.get("/:id", requireAuth, getMessage);

// =========================
// ✅ EXPORT
// =========================

export default router;
