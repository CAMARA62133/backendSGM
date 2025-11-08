import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

// Importation des routes
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

import { connectDB, sequelize } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// ----------------------
// 🔹 Création de l'app Express
// ----------------------
const app = express();

// ===============================================================
// 🧠 Fonction principale de démarrage
// ===============================================================
const startServer = async () => {
  try {
    // Connexion à la base
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log("📦 Modèles synchronisés avec la base PostgreSQL");

    // CORS
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
    app.use(
      cors({
        origin: allowedOrigin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      })
    );

    app.use(express.json());
    app.use(cookieParser());

    // Dossier uploads
    app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "public/uploads"))
    );

    // Routes API
    app.use("/api/users", userRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/messages", messageRoutes);
    app.use("/api/notifications", notificationRoutes);

    // Lancement du serveur
    app.listen(PORT, () =>
      console.log(`✅ Serveur en fonctionnement sur le port ${PORT}`)
    );
  } catch (error) {
    console.error("❌ Erreur de démarrage du serveur :", error);
    process.exit(1);
  }
};

startServer();
