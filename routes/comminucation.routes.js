import express from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createGroup,
  getCommunication,
  sendCommunication,
  getUserGroups,
  deleteGroup,
  updateGroup,
  nombreCommunicationNonLus,
  getUnreadByConversation,
  updateCommunication,
  deleteCommunication,
  getMesCollegues,
} from "../controllers/comminucationController.js";
const router = express.Router();

// --- ANNUAIRE / COLLÈGUES ---
router.get("/mes-collegues", requireAuth, getMesCollegues);

// --- NOTIFICATIONS ---
router.get("/unread-count", requireAuth, nombreCommunicationNonLus);
router.get("/unread-by-conversation", requireAuth, getUnreadByConversation);

// --- MESSAGES ---
router.get("/", requireAuth, getCommunication);
router.post("/", requireAuth, sendCommunication);

// --- ACTIONS SUR UN MESSAGE SPÉCIFIQUE ---
router.put("/:id", requireAuth, updateCommunication);
router.delete("/:id", requireAuth, deleteCommunication);

// --- GROUPES ---
router.post("/groups", requireAuth, createGroup);
router.get("/groups", requireAuth, getUserGroups);
router.put("/groups/:groupId", requireAuth, updateGroup);
router.delete("/groups/:groupId", requireAuth, deleteGroup);

export default router;
