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
} from "../controllers/comminucationController.js";

const router = express.Router();

// --- NOTIFICATIONS ---
// On la place en haut pour éviter les conflits de paramètres
router.get("/unread-count", requireAuth, nombreCommunicationNonLus);

// --- MESSAGES ---
router.get("/", requireAuth, getCommunication);
router.post("/", requireAuth, sendCommunication);

// --- GROUPES ---
router.post("/groups", requireAuth, createGroup);
router.get("/groups", requireAuth, getUserGroups);
router.put("/groups/:groupId", requireAuth, updateGroup);
router.delete("/groups/:groupId", requireAuth, deleteGroup);
router.get("/unread-by-conversation", requireAuth, getUnreadByConversation);
export default router;
