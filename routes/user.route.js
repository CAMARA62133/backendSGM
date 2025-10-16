// =========================
// routes/user.route.js
// =========================

import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
  importUsers,
} from "../controllers/userControllers.js"; // contrôleurs des utilisateurs
import upload from "../middlewares/uploads.js"; // middleware pour gérer les fichiers uploadés
import { getCurrentUser } from "../controllers/authControllers.js"; // récupère l'utilisateur connecté
import { requireAuth } from "../middlewares/authMiddlewares.js"; // middleware d'authentification

const router = express.Router();

// =========================
// 📌 ROUTES USERS - CRUD
// =========================

// 🔹 Créer un utilisateur
// POST /api/users/
// - Utilise upload.single("file") pour gérer l'upload d'une photo ou d'un fichier
router.post("/", upload.single("file"), createUser);

// 🔹 Récupérer la liste de tous les utilisateurs
// GET /api/users/
router.get("/", getAllUsers);

// 🔹 Récupérer les informations de l'utilisateur connecté
// GET /api/users/me
// - Middleware requireAuth pour s'assurer que l'utilisateur est authentifié
// - Doit être avant la route /:id pour éviter les conflits
router.get("/me", requireAuth, getCurrentUser);

// 🔹 Récupérer un utilisateur par son ID
// GET /api/users/:id
router.get("/:id", getUserById);

// 🔹 Mettre à jour un utilisateur
// PUT /api/users/:id
// - Upload possible d'une nouvelle photo avec upload.single("file")
router.put("/:id", upload.single("file"), updateUser);

// 🔹 Supprimer un utilisateur
// DELETE /api/users/:id
router.delete("/:id", deleteUser);

// 🔹 Réinitialiser le mot de passe d'un utilisateur
// POST /api/users/reset-password
router.post("/reset-password", resetPassword);

// 🔹 Importer des utilisateurs depuis un fichier Excel/CSV
// POST /api/users/import
// - Upload d'un fichier contenant plusieurs utilisateurs
router.post("/import", upload.single("file"), importUsers);

// =========================
// ✅ EXPORT DU ROUTEUR
// =========================
export default router;
