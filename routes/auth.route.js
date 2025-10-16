import express from "express";
import { login, logout, toggleActive } from "../controllers/authControllers.js";
import { requireAdmin, requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ==============================
// 🔹 Route de connexion
// ------------------------------
// Méthode : POST
// URL : /api/auth/login
// Description : Permet à un utilisateur de se connecter avec email et mot de passe
router.post("/login", login);

// ==============================
// 🔹 Route de déconnexion
// ------------------------------
// Méthode : GET
// URL : /api/auth/logout
// Description : Déconnecte l'utilisateur et détruit le token JWT
router.get("/logout", logout);

// ==============================
// 🔹 Route pour activer/désactiver un utilisateur
// ------------------------------
// Méthode : PATCH
// URL : /api/auth/toggle/:id
// Middleware :
//   - requireAuth : Vérifie que l'utilisateur est connecté
//   - requireAdmin : Vérifie que l'utilisateur a le rôle "admin"
// Description : Permet à un admin de basculer l'état actif/inactif d'un utilisateur
router.patch("/toggle/:id", requireAuth, requireAdmin, toggleActive);

// ==============================
// 🔹 Export du routeur
// ==============================
export default router;
