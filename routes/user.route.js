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
  importUsers,
  changePassword,
} from "../controllers/userControllers.js";
import upload from "../middlewares/uploads.js";
import { getCurrentUser } from "../controllers/authControllers.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// =========================
// 📌 ROUTES USERS - CRUD
// =========================

// 🔹 Créer un utilisateur
// POST /api/users/
// - Upload d'une photo de profil
router.post("/", upload.single("photo"), createUser);

// 🔹 Récupérer la liste de tous les utilisateurs
router.get("/", requireAuth, getAllUsers);

// 🔹 Récupérer les informations de l'utilisateur connecté
router.get("/me", requireAuth, getCurrentUser);

// 🔹 Récupérer un utilisateur par son ID
router.get("/:id", getUserById);

// 🔹 Mettre à jour un utilisateur
// PUT /api/users/:id
// - Upload possible d'une nouvelle photo de profil
router.put("/:id", upload.single("photo"), updateUser);

// 🔹 Supprimer un utilisateur
router.delete("/:id", deleteUser);

// 🔹 Réinitialiser le mot de passe d'un utilisateur
router.post("/change-password", changePassword);

// 🔹 Importer des utilisateurs depuis un fichier Excel/CSV
// POST /api/users/import
// - Upload d'un fichier contenant plusieurs utilisateurs
router.post("/import", upload.single("file"), importUsers);

// =========================
// ✅ EXPORT DU ROUTEUR
// =========================
export default router;
