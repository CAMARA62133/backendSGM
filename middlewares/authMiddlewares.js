import jwt from "jsonwebtoken";
import { createToken, getCookieOptions } from "../utils/jwtUtil.js";

// ==============================
// AUTHENTIFICATION + INACTIVITÉ
// ==============================

export const requireAuth = async (req, res, next) => {
  const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

  //  Absence de token
  if (!token) {
    return res.status(401).json({ message: "Session introuvable ou expirée." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    //  Compte inactif
    if (!decoded.isActif) {
      return res.status(403).json({
        message:
          "Votre compte est désactivé. Veuillez contacter l'administrateur.",
      });
    }

    //  Succès & Prolongation
    req.user = decoded;
    res.cookie("jwt", createToken(decoded), getCookieOptions());
    next();
  } catch (error) {
    //  Gestion des erreurs (Expiration ou Corruption)
    const options = getCookieOptions();
    delete options.maxAge;
    res.clearCookie("jwt", options);

    const isExpired = error.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Session expirée par inactivité."
        : "Session invalide.",
    });
  }
};
// ==============================
// AUTORISATION ADMIN
// ==============================
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "Utilisateur non authentifié",
    });
  }

  if (req.user.type !== "admin") {
    return res.status(403).json({
      message: "Accès refusé : rôle administrateur requis",
    });
  }

  next();
};
