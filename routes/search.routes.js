import express from "express";
import { globalSearch } from "../controllers/searchController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();
router.use(requireAuth);

router.get("/", globalSearch);

export default router;
