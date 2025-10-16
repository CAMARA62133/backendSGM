// =========================
// server.js
// =========================

// 🔹 Importation des modules nécessaires
import path from "path"; // Pour gérer les chemins de fichiers
import express from "express"; // Framework Express pour le serveur
import cors from "cors"; // Pour gérer les requêtes cross-origin
import cookieParser from "cookie-parser"; // Pour gérer les cookies
import dotenv from "dotenv"; // Pour charger les variables d'environnement
import connectDB from "./config/db.js"; // Fonction pour connecter MongoDB

// 🔹 Importation des routes
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import messageroutes from "./routes/message.routes.js";
import dossierroutes from "./routes/dossier.routes.js";
import notificationroutes from "./routes/notification.routes.js";

// 🔹 Chargement des variables d'environnement depuis .env
dotenv.config({ path: "./config/.env" });

const app = express(); // Création de l'application Express
const PORT = process.env.PORT || 5000; // Port par défaut ou celui défini dans .env

// =========================
// === FONCTION DE DEMARRAGE DU SERVEUR ===
// =========================
const startServer = async () => {
  try {
    // 🔹 Connexion à la base de données MongoDB
    await connectDB();

    // =========================
    // === MIDDLEWARES ===
    // =========================

    // 🔹 Configuration CORS (autoriser le front-end à communiquer avec le serveur)
    const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
    app.use(
      cors({
        origin: allowedOrigin, // URL autorisée
        credentials: true, // Autoriser l'envoi des cookies
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Méthodes HTTP autorisées
        allowedHeaders: ["Content-Type", "Authorization"], // Headers autorisés
      })
    );

    // 🔹 Middleware pour parser le corps des requêtes en JSON
    app.use(express.json());

    // 🔹 Middleware pour parser les cookies
    app.use(cookieParser());

    // 🔹 Servir les fichiers statiques (uploads)
    // Ex : accès aux fichiers via http://localhost:3000/uploads/nomFichier.ext
    app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "public/uploads"))
    );

    // =========================
    // === ROUTES API ===
    // =========================
    // Préfixes pour les différentes routes
    app.use("/api/users", userRoutes); // Gestion des utilisateurs
    app.use("/api/auth", authRoutes); // Authentification (login, logout)
    app.use("/api/messages", messageroutes); // Gestion des messages
    app.use("/api/dossiers", dossierroutes); // Gestion des dossiers/fichiers
    app.use("/api/notifications", notificationroutes); // Gestion des notifications

    // =========================
    // === LANCEMENT DU SERVEUR ===
    // =========================
    app.listen(PORT, () => {
      console.log(`✅ Serveur en fonctionnement sur le port ${PORT}`);
      console.log(
        `📂 Accès aux fichiers statiques via http://localhost:${PORT}/uploads/...`
      );
    });
  } catch (error) {
    // 🔴 Gestion des erreurs lors du démarrage
    console.error("❌ Erreur lors du démarrage du serveur :", error);
    process.exit(1); // Arrêt du serveur en cas d'erreur critique
  }
};

// 🔹 Lancement de la fonction startServer
startServer();
