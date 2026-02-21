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

// Routes
import userRoutes from "./routes/user.route.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.routes.js";
import communicationRoutes from "./routes/comminucation.routes.js";

// DB
import { connectDB, sequelize } from "./config/db.js";

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

app.use(express.json());
app.use(cookieParser());
// app.use(express.static(path.join(process.cwd(), "public")));

app.use("/uploads", express.static(path.join(process.cwd(), "public/uploads")));

// -------------------------
// INITIALISATION SOCKET.IO
// -------------------------
const io = initSocket(server);

// 🔥 IMPORTANT : injection dans req
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

// -------------------------
// START SERVER
// -------------------------
const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });

    console.log("✅ Modèles synchronisés avec PostgreSQL");

    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Erreur de démarrage:", error);
    process.exit(1);
  }
};

startServer();
