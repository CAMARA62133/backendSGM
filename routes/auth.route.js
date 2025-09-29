import express from "express";
import { login, logout, toggleActive } from "../controllers/authControllers.js";
import { requireAdmin, requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// Routes Auth
router.post("/login", login);
router.get("/logout", logout);
router.patch("/toggle/:id", requireAuth, requireAdmin, toggleActive);

export default router;
