import express from "express";
import { requireAuth } from "../middlewares/authMiddlewares.js";
import {
  createGroup,
  getCommunication,
  sendCommunication,
  getUserGroups,
  deleteGroup,
} from "../controllers/comminucationController.js";

const router = express.Router();

// Messages
router.get("/", requireAuth, getCommunication);
router.post("/", requireAuth, sendCommunication);

// Groupes
router.post("/groups", requireAuth, createGroup);
router.get("/groups", requireAuth, getUserGroups);
router.delete("/groups/:groupId", requireAuth, deleteGroup);

export default router;
