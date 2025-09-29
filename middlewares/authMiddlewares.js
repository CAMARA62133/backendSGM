import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ------------------------
// Vérifie et attache l'utilisateur à req.user (authentification requise)
// ------------------------
export const requireAuth = async (req, res, next) => {
  const token = req.cookies?.jwt || req.headers?.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Accès refusé : token manquant" });

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user)
      return res.status(401).json({ message: "Utilisateur introuvable" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// ------------------------
// Vérifie rôle admin
// ------------------------
export const requireAdmin = (req, res, next) => {
  if (req.user?.type === "admin") return next();
  return res.status(403).json({ message: "Accès refusé : rôle admin requis" });
};

// ------------------------
// Vérifie rôle(s) spécifique(s)
// ------------------------
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

