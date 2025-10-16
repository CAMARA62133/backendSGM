// =========================
// routes/message.route.js
// =========================

import express from "express";
import upload from "../middlewares/uploads.js"; // Middleware pour gérer les fichiers uploadés
import { requireAuth as proteger } from "../middlewares/authMiddlewares.js"; // Middleware d'authentification

import {
  envoyerMessage,
  getMessagesRecus,
  getMessagesEnvoyes,
  getBrouillons,
  getFavoris,
  getMessagesArchives,
  getMessage,
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
// -------------------------
// Routes pour obtenir le nombre de messages par catégorie
// Doit être placé en haut pour éviter de matcher avec /:id

router.get("/count/unread", proteger, nombreMessagesNonLus); // Nombre de messages non lus
router.get("/count/drafts", proteger, nombreBrouillons); // Nombre de brouillons
router.get("/count/archived", proteger, nombreMessagesArchives); // Nombre de messages archivés
router.get("/count/trash", proteger, nombreMessagesCorbeille); // Nombre de messages dans la corbeille
router.get("/count/favori", proteger, nombreMessagesFavoris); // Nombre de messages favoris

// =========================
// 🗂️ ROUTES DE MESSAGES PAR DOSSIERS
// -------------------------
// Routes spécifiques pour filtrer les messages selon leur type ou dossier

router.get("/recus", proteger, getMessagesRecus); // Récupérer les messages reçus
router.get("/envoyes", proteger, getMessagesEnvoyes); // Récupérer les messages envoyés
router.get("/brouillons", proteger, getBrouillons); // Récupérer les brouillons
router.get("/favoris", proteger, getFavoris); // Récupérer les messages favoris
router.get("/archives", proteger, getMessagesArchives); // Récupérer les messages archivés
router.get("/corbeille", proteger, getCorbeille); // Récupérer les messages dans la corbeille
router.get("/conversation/:threadId", proteger, getConversation); // Récupérer une conversation complète par threadId

// =========================
// ⚙️ ACTIONS GÉNÉRALES
// -------------------------
// Actions globales qui ne concernent pas un message précis

router.put("/marquer-lus", proteger, marquerTousLus); // Marquer tous les messages comme lus
router.delete("/corbeille", proteger, viderCorbeille); // Vider toute la corbeille

// =========================
// 📧 ROUTES PRINCIPALES
// -------------------------
// Envoi de messages avec possibilité d'ajouter des fichiers joints (max 5 fichiers)

router.post("/", proteger, upload.array("piecesJointes", 5), envoyerMessage);

// =========================
// 🆔 ROUTES DYNAMIQUES AVEC ID
// -------------------------
// Actions sur un message spécifique identifié par son ID
// Ces routes doivent toujours être placées après les routes spécifiques ci-dessus

router.put("/:id/lu", proteger, marquerCommeLu); // Marquer un message comme lu
router.put("/:id/archive", proteger, toggleArchiveMessage); // Archiver ou désarchiver un message
router.put("/:id/favori", proteger, toggleFavori); // Ajouter ou retirer des favoris
router.put("/:id/supprimer", proteger, supprimerMessage); // Déplacer un message vers la corbeille
router.put("/:id/restaurer", proteger, restaurerMessage); // Restaurer un message depuis la corbeille
router.delete("/:id", proteger, supprimerDefinitivement); // Supprimer définitivement un message
router.get("/:id", proteger, getMessage); // Récupérer les détails d'un message spécifique

// =========================
// ✅ EXPORT DU ROUTEUR
// =========================
export default router;
