// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/user.route.js"; // correct
import authRoutes from "./routes/auth.route.js"; // auth séparé

dotenv.config({ path: "./config/.env" });

const app = express();
const PORT = process.env.PORT;

// =========================
// === CONNEXION MONGODB ===
// =========================
const startServer = async () => {
  try {
    await connectDB();

    // =========================
    // === MIDDLEWARES ===
    // =========================
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
    app.use(
      cors({
        origin: allowedOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    app.use(express.json());
    app.use(cookieParser());

    // =========================
    // === ROUTES  ===
    // =========================
    app.use("/api/users", userRoutes);
    app.use("/api/auth", authRoutes);
    // =========================
    // === LANCEMENT SERVEUR ===
    // =========================
    app.listen(PORT, () => {
      console.log(`✅ Serveur en fonctionnement sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erreur lors du démarrage du serveur :", error);
    process.exit(1);
  }
};

startServer();
