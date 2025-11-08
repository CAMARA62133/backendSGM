// ===============================================================
// 📂 Fichier : controllers/authControllers.js
// ===============================================================
// Ce contrôleur gère les opérations d’authentification des utilisateurs :
// - Connexion (login)
// - Déconnexion (logout)
// - Activation/Désactivation d’un utilisateur
// - Récupération de l’utilisateur actuellement connecté
// ===============================================================

// ===============================================================
// 📦 Importation des modules nécessaires
// ===============================================================
import User from "../models/User.js"; // Modèle Sequelize
import Notification from "../models/Notification.js"; // Modèle Notification Sequelize
import { createToken, maxAge } from "../utils/jwtUtil.js"; // Gestion JWT
import bcrypt from "bcrypt";

// ===============================================================
// 🔐 --- LOGIN (Connexion d’un utilisateur) ---
// ===============================================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifie si l'utilisateur existe dans la base
    const user = await User.findOne({ where: { email } });
    if (!user)
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });

    // Vérifie le mot de passe (haché avec bcrypt)
    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });

    // Vérifie si le compte est actif
    if (!user.isActif) {
      return res.status(403).json({
        message: "Compte désactivé. Contactez l'administrateur.",
      });
    }

    // Création du token JWT
    const token = createToken(user.id);

    // ===============================================================
    // 🔔 Enregistrement d’une notification de connexion
    // ===============================================================
    const notif = await Notification.create({
      userId: user.id,
      message: `Connexion réussie pour ${user.nom} ${user.prenom}`,
      data: { type: "login" },
    });

    // Émission temps réel si Socket.IO est connecté
    if (req.io) {
      req.io.emit("nouvelle_notification", notif);
    }

    // Envoi du cookie JWT
    res
      .cookie("jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: maxAge * 1000,
        sameSite: "lax",
      })
      .status(200)
      .json({
        message: "Connexion réussie",
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          type: user.type,
          isActif: user.isActif,
        },
      });
  } catch (error) {
    console.error("❌ Erreur lors du login :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===============================================================
// 🚪 --- LOGOUT (Déconnexion d’un utilisateur) ---
// ===============================================================

export const logout = async (req, res) => {
  try {
    if (req.user) {
      // Création d'une notification de déconnexion
      const notif = await Notification.create({
        userId: req.user.id,
        message: `Déconnexion réussie pour ${req.user.nom} ${req.user.prenom}`,
        data: { type: "logout" },
      });

      if (req.io) {
        req.io.emit("nouvelle_notification", notif);
      }
    }

    // Suppression du cookie JWT
    res.clearCookie("jwt", { httpOnly: true, sameSite: "lax" });
    res.status(200).json({ message: "Déconnexion réussie." });
  } catch (error) {
    console.error("❌ Erreur lors de la déconnexion :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===============================================================
// ⚙️ --- ACTIVER / DÉSACTIVER UN UTILISATEUR ---
// ===============================================================

export const toggleActive = async (req, res) => {
  try {
    // Recherche de l'utilisateur par son ID
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    // Inversion de l'état actif/inactif
    user.isActif = !user.isActif;
    await user.save();

    // Création d’une notification d’action
    const notif = await Notification.create({
      userId: req.user.id, // L'administrateur qui a fait le changement
      message: `Utilisateur ${user.nom} ${user.prenom} ${
        user.isActif ? "activé" : "désactivé"
      }`,
      data: { userId: user.id, type: "toggleActive" },
    });

    if (req.io) {
      req.io.emit("nouvelle_notification", notif);
    }

    res.status(200).json({
      message: `Utilisateur ${user.nom} ${user.prenom} ${
        user.isActif ? "activé" : "désactivé"
      } avec succès.`,
    });
  } catch (error) {
    console.error("❌ Erreur lors du changement d’état :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===============================================================
// 👤 --- GET CURRENT USER (Utilisateur connecté) ---
// ===============================================================

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Récupère l’utilisateur connecté depuis la base (avec Sequelize)
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    res.status(200).json({ user });
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération de l'utilisateur :",
      error
    );
    res.status(500).json({ message: "Erreur serveur" });
  }
};
