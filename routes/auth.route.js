import express from "express";
import {
  login,
  logout,
  toggleActive,
  profil,
} from "../controllers/authControllers.js";
import { requireAdmin, requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();


router.post("/login", login);

router.get("/logout", logout);
// Profil
router.get("/profil", requireAuth, profil);
router.patch("/toggle/:id", requireAuth, requireAdmin, toggleActive);


export default router;
