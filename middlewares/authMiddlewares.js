import jwt from "jsonwebtoken";
import User from "../models/User.js"; // Modèle Sequelize
import { generateShortToken } from "../utils/jwtUtil.js";

/**
 * ==============================
 * REQUIRE AUTH
 * ==============================
 */
export const requireAuth = async (req, res, next) => {
  // Récupérer le token depuis les cookies ou l'en-tête Authorization
  const token =
    req.cookies?.jwt ||
    (req.headers?.authorization
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token)
    return res.status(401).json({ message: "Accès refusé : token manquant" });

  try {
    // Vérifie le token
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Récupère l'utilisateur depuis la base
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user)
      return res.status(401).json({ message: "Utilisateur introuvable" });

    req.user = user; // attache l'utilisateur à la requête

    // 🔹 Rafraîchir le token à chaque action (déconnexion automatique après 15 min d'inactivité)
    const newToken = generateShortToken(user.id);
    res.cookie("jwt", newToken, {
      httpOnly: true,
      maxAge: 15* 60 * 1000, // 15 minutes en ms
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production", // cookie sécurisé en production
    });

    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

/**
 * ==============================
 * REQUIRE ADMIN
 * ==============================
 */
export const requireAdmin = (req, res, next) => {
  if (req.user?.type === "admin") return next();
  return res.status(403).json({ message: "Accès refusé : rôle admin requis" });
};

/**
 * ==============================
 * CHECK ROLE
 * ==============================
 */
export const checkRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    if (roles.includes(req.user.type)) return next();

    return res
      .status(403)
      .json({ message: "Accès non autorisé : rôle requis" });
  };
