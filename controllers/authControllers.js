// ===============================================================
// 📦 Importation des modules nécessaires
// ===============================================================
// ✅ On utilise l'index pour garantir que les relations (groupes, messages) sont chargées
import { User } from "../models/index.js";
import { createToken, getCookieOptions } from "../utils/jwtUtil.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/email.js";

// --- Connexion de l'utilisateur ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Recherche de l'utilisateur
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: "Cette adresse email n'est associée à aucun compte.",
      });
    }

    // 1. Vérifie le mot de passe
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // 2. Vérifie si le compte est actif
    if (!user.isActif) {
      return res.status(403).json({
        message:
          "Votre compte est désactivé. Veuillez contacter l'administrateur.",
      });
    }

    // 3. Vérifie si changement de mot de passe requis (ex: premier login)
    if (user.doitChangerPassword) {
      return res.status(403).json({
        message: "Vous devez changer votre mot de passe avant de continuer.",
        userId: user.id,
      });
    }

    // Extraction des données publiques (on retire le password)
    const { password: _, ...userPublic } = user.get();

    // Génération du Token JWT et envoi du Cookie
    const token = createToken(userPublic);
    res.cookie("jwt", token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "Utilisateur connecté avec succès !",
      user: userPublic,
    });
  } catch (error) {
    console.error("ERREUR SERVEUR LOGIN:", error.message);
    res.status(500).json({
      message: "Une erreur interne est survenue lors de la connexion.",
    });
  }
};

// --- Déconnexion ---
export const logout = (req, res) => {
  res.clearCookie("jwt", getCookieOptions());
  return res.status(200).json({ message: "Déconnexion réussie." });
};

// --- ACTIVER / DÉSACTIVER UN UTILISATEUR + EMAIL ---
export const toggleActive = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    // Inversion de l'état
    user.isActif = !user.isActif;
    await user.save();

    // Préparation de l'email
    const sujet = user.isActif
      ? "Activation de votre compte ✅"
      : "Désactivation de votre compte ⚠️";
    const statusText = user.isActif ? "activé" : "désactivé";

    const messageEmail = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <p>Bonjour <strong>${user.prenom}</strong>,</p>
        <p>Votre compte a été <strong>${statusText}</strong> par l'administrateur.</p>
        ${
          user.isActif
            ? `<p><a href="${process.env.FRONTEND_URL}/login">Cliquez ici pour vous connecter</a></p>`
            : `<p>Veuillez contacter le support pour plus d'informations.</p>`
        }
        <p>Cordialement,<br>L'équipe technique</p>
      </div>
    `;

    // Envoi asynchrone (ne bloque pas la réponse API)
    sendEmail(user.email, sujet, messageEmail).catch((err) =>
      console.error("Erreur envoi email toggleActive:", err.message),
    );

    res.status(200).json({
      success: true,
      message: `Utilisateur ${user.prenom} ${statusText}.`,
      isActif: user.isActif,
    });
  } catch (error) {
    console.error("❌ Erreur toggleActive :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// --- GET CURRENT USER (Profil) ---
export const profil = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    // On recharge l'utilisateur depuis la DB pour avoir les infos à jour
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] }, // Sécurité : on ne renvoie jamais le password
    });

    res.json(user);
  } catch (error) {
    console.error("Erreur profil:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du profil" });
  }
};
