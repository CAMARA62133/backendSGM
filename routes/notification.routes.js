import express from "express";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// =========================
// 🔔 ROUTES DES NOTIFICATIONS
// -------------------------
// Toutes les routes sont protégées par requireAuth
// pour que seul l'utilisateur authentifié puisse y accéder

// 🔹 Récupérer toutes les notifications de l'utilisateur connecté
// GET /api/notifications/
router.get("/", requireAuth, getNotifications);

// 🔹 Marquer une notification spécifique comme lue
// PATCH /api/notifications/read/:id
// :id => ID de la notification à marquer comme lue
router.patch("/read/:id", requireAuth, markAsRead);

// 🔹 Marquer toutes les notifications de l'utilisateur comme lues
// PATCH /api/notifications/read-all
router.patch("/read-all", requireAuth, markAllAsRead);

// 🔹 Supprimer une notification spécifique
// DELETE /api/notifications/:id
// :id => ID de la notification à supprimer
router.delete("/:id", requireAuth, deleteNotification);

// =========================
// ✅ EXPORT DU ROUTEUR
// =========================
export default router;
