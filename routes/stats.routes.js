import express from "express";
import { getUserStats } from "../controllers/statsController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js"; 

const router = express.Router();

router.use(requireAuth);
router.get("/", getUserStats);

export default router;
