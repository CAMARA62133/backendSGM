import jwt from "jsonwebtoken"; // Module pour gérer les tokens JWT
import User from "../models/User.js"; // Modèle Mongoose de l'utilisateur

/**
 * ==============================
 * REQUIRE AUTH
 * ==============================
 * Middleware pour vérifier que l'utilisateur est authentifié.
 * Vérifie le token JWT dans les cookies ou dans l'en-tête Authorization.
 * Si valide, attache l'utilisateur à req.user pour utilisation dans les routes.
 * Route protégée : toutes routes nécessitant authentification
 */
export const requireAuth = async (req, res, next) => {
  // Récupère le token depuis les cookies ou l'en-tête Authorization
  const token = req.cookies?.jwt || req.headers?.authorization?.split(" ")[1];

  // Si aucun token, accès refusé
  if (!token)
    return res.status(401).json({ message: "Accès refusé : token manquant" });

  try {
    // Vérifie le token avec la clé secrète
    const decoded = jwt.verify(token, process.env.TOKEN_SECRET);

    // Récupère l'utilisateur correspondant à l'ID du token
    const user = await User.findById(decoded.id).select("-password"); // exclut le mot de passe

    // Si l'utilisateur n'existe pas, accès refusé
    if (!user)
      return res.status(401).json({ message: "Utilisateur introuvable" });

    // Attache l'utilisateur à req pour les middlewares/routes suivants
    req.user = user;

    // Passe au middleware/route suivant
    next();
  } catch (err) {
    // Token invalide ou expiré
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

/**
 * ==============================
 * REQUIRE ADMIN
 * ==============================
 * Middleware pour vérifier que l'utilisateur a le rôle 'admin'.
 * À utiliser sur les routes réservées aux administrateurs.
 */
export const requireAdmin = (req, res, next) => {
  // Si l'utilisateur est admin, autorisé
  if (req.user?.type === "admin") return next();

  // Sinon accès refusé
  return res.status(403).json({ message: "Accès refusé : rôle admin requis" });
};

/**
 * ==============================
 * CHECK ROLE
 * ==============================
 * Middleware générique pour vérifier un ou plusieurs rôles spécifiques.
 * Paramètre : une ou plusieurs chaînes de caractères représentant les rôles autorisés.
 * Exemple : checkRole("admin", "manager")
 */
export const checkRole =
  (...roles) =>
  (req, res, next) => {
    // Vérifie que l'utilisateur est authentifié
    if (!req.user)
      return res.status(401).json({ message: "Utilisateur non authentifié" });

    // Vérifie si le rôle de l'utilisateur est inclus dans les rôles autorisés
    if (roles.includes(req.user.type)) return next();

    // Sinon accès refusé
    return res
      .status(403)
      .json({ message: "Accès non autorisé : rôle requis" });
  };
