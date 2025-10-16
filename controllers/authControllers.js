// ===============================================================
// 📂 Fichier : controllers/authControllers.js
// ===============================================================
// Ce contrôleur gère toutes les opérations liées à l'authentification des utilisateurs :
// - Connexion (login)
// - Déconnexion (logout)
// - Activation/Désactivation d’un utilisateur
// - Récupération de l’utilisateur actuellement connecté
// ===============================================================

// ===============================================================
// 📦 Importation des modules nécessaires
// ===============================================================

// Modèle utilisateur (pour accéder aux données dans MongoDB)
import User from "../models/User.js";

// Fonctions utilitaires JWT pour la création de tokens d’authentification
import { createToken, maxAge } from "../utils/jwtUtil.js";

// Modèle de notifications (pour enregistrer et émettre des notifications)
import Notification from "../models/Notification.js";

// ===============================================================
// 🔐 --- LOGIN (Connexion d’un utilisateur) ---
// ===============================================================

export const login = async (req, res) => {
  try {
    // Extraction de l'email et du mot de passe envoyés dans la requête
    const { email, password } = req.body;

    // Vérifie si les identifiants sont valides à l’aide de la méthode statique "login" du modèle User
    const user = await User.login(email, password);

    // Génère un token JWT contenant l’ID utilisateur
    const token = createToken(user._id);

    // Sauvegarde du user (utile si certains champs comme "dernier login" doivent être mis à jour)
    await user.save();

    // ===============================================================
    // 🔔 Création d’une notification de connexion
    // ===============================================================
    const notif = new Notification({
      user: user._id,
      message: `Connexion réussie pour ${user.nom} ${user.prenom}`,
      data: { type: "login" },
    });
    await notif.save();

    // Envoi en temps réel de la notification via Socket.IO (si disponible)
    if (req.io)
      req.io.to(user._id.toString()).emit("nouvelle_notification", notif);

    // ===============================================================
    // 🍪 Envoi du cookie JWT au client
    // ===============================================================
    res
      .cookie("jwt", token, {
        httpOnly: true, // Empêche l’accès au cookie via JavaScript côté client (sécurité)
        secure: process.env.NODE_ENV === "production", // Utilise HTTPS seulement en production
        maxAge: maxAge * 1000, // Durée de vie du token (convertie en millisecondes)
        sameSite: "lax", // Protection CSRF tout en autorisant la navigation interne
      })
      .status(200)
      .json({
        message: "Connexion réussie",
        user: {
          id: user._id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          type: user.type,
          isActif: user.isActif,
        },
      });
  } catch (err) {
    // Gestion des erreurs (identifiants invalides, utilisateur inactif, etc.)
    res.status(400).json({ message: err.message });
  }
};

// ===============================================================
// 🚪 --- LOGOUT (Déconnexion d’un utilisateur) ---
// ===============================================================

export const logout = async (req, res) => {
  try {
    // Vérifie qu’un utilisateur est bien authentifié avant d’enregistrer une notification
    if (req.user) {
      const notif = new Notification({
        user: req.user._id,
        message: `Déconnexion réussie pour ${req.user.nom} ${req.user.prenom}`,
        data: { type: "logout" },
      });
      await notif.save();

      // Envoi temps réel via Socket.IO (si la connexion WebSocket existe)
      if (req.io)
        req.io.to(req.user._id.toString()).emit("nouvelle_notification", notif);
    }

    // Suppression du cookie JWT (déconnexion)
    res
      .clearCookie("jwt", { httpOnly: true, sameSite: "lax" })
      .status(200)
      .json({ message: "Déconnexion réussie." });
  } catch (err) {
    // Gestion des erreurs éventuelles (ex : problème de base de données)
    res.status(500).json({ message: err.message });
  }
};

// ===============================================================
// ⚙️ --- ACTIVER / DÉSACTIVER UN UTILISATEUR ---
// ===============================================================

export const toggleActive = async (req, res) => {
  try {
    // Recherche de l’utilisateur cible à partir de l’ID passé en paramètre
    const user = await User.findById(req.params.id);

    // Si aucun utilisateur n’est trouvé, renvoyer une erreur 404
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    // Inversion de l’état actuel (true ⇄ false)
    user.isActif = !user.isActif;
    await user.save();

    // ===============================================================
    // 🔔 Notification d’activation ou désactivation
    // ===============================================================
    const notif = new Notification({
      user: req.user._id, // L’utilisateur qui effectue l’action (admin)
      message: `Utilisateur ${user.nom} ${user.prenom} ${
        user.isActif ? "activé" : "désactivé"
      }`,
      data: { userId: user._id, type: "toggleActive" },
    });
    await notif.save();

    // Envoi en temps réel (Socket.IO)
    if (req.io)
      req.io.to(req.user._id.toString()).emit("nouvelle_notification", notif);

    // Réponse HTTP de succès
    res.status(200).json({
      message: `Utilisateur ${user.nom} ${user.prenom} ${
        user.isActif ? "activé" : "désactivé"
      } avec succès.`,
    });
  } catch (err) {
    // Gestion des erreurs serveur
    res.status(500).json({ message: err.message });
  }
};

// ===============================================================
// 👤 --- GET CURRENT USER (Utilisateur connecté) ---
// ===============================================================

export const getCurrentUser = (req, res) => {
  try {
    // Vérifie si un utilisateur est authentifié via middleware (JWT)
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    // Retourne les informations de l’utilisateur connecté
    res.status(200).json({ user: req.user });
  } catch (err) {
    // En cas d’erreur inattendue
    res.status(500).json({ message: err.message });
  }
};
