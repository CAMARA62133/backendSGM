// routes/user.route.js
import express from "express";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/userControllers.js"; // attention au nom exact du fichier
import upload from "../middlewares/uploads.js"; // extension .js

const router = express.Router();

// =========================
// ===== CRUD Users ========
// =========================
router.post("/", upload.single("file"), createUser); // création utilisateur
router.get("/", getAllUsers); // liste utilisateurs
router.get("/:id", getUserById); // utilisateur par ID
router.put("/:id", upload.single("file"), updateUser); // mise à jour utilisateur
router.delete("/:id", deleteUser); // suppression utilisateur

export default router;
