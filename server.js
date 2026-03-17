// -------------------------
// ENV
// -------------------------
import dotenv from "dotenv";
dotenv.config({ path: "./config/.env" });

// -------------------------
// IMPORTS
// -------------------------
import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";

// ✅ ON IMPORTE LE CERVEAU DEPUIS L'INDEX
// C'est initDatabase qui va maintenant gérer la connexion et l'admin
import { initDatabase } from "./models/index.js";

// Routes existantes
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import communicationRoutes from "./routes/comminucation.routes.js";
import aiRoutes from "./routes/ai.route.js";

// NOUVELLES ROUTES
import fileRoutes from "./routes/file.routes.js";
import pinRoutes from "./routes/pin.routes.js";
import pollRoutes from "./routes/poll.routes.js";
import readReceiptRoutes from "./routes/readReceipt.routes.js";
import searchRoutes from "./routes/search.routes.js";
import statsRoutes from "./routes/stats.routes.js";
import dndRoutes from "./routes/dnd.routes.js";

// Socket
import { initSocket, onlineUsers } from "./utils/socket.js";

// -------------------------
// CONFIG
// -------------------------
const PORT = process.env.PORT || 5000;
const app = express();
const server = http.createServer(app);

// -------------------------
// MIDDLEWARES
// -------------------------
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// -------------------------
// INITIALISATION SOCKET.IO
// -------------------------
const io = initSocket(server);

app.use((req, res, next) => {
  req.io = io;
  req.onlineUsers = onlineUsers;
  next();
});

// -------------------------
// ROUTES
// -------------------------
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/communications", communicationRoutes);
app.use("/api/ask-ai", aiRoutes);

app.use("/api/files", fileRoutes);
app.use("/api/pins", pinRoutes);
app.use("/api/polls", pollRoutes);
app.use("/api/read-receipts", readReceiptRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/dnd", dndRoutes);

// -------------------------
// START SERVER
// -------------------------
const startServer = async () => {
  try {
    // 🚀 UN SEUL APPEL : initDatabase s'occupe de tout :
    // 1. Connexion physique (authenticate)
    // 2. Création du schéma SQL
    // 3. Synchronisation des modèles (sync alter:true)
    // 4. Création de l'admin si inexistant
    await initDatabase();

    console.log("✅ Système de base de données prêt.");

    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Impossible de démarrer le serveur :", error);
    process.exit(1);
  }
};

startServer();
