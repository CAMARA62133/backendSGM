// ===============================================================
// 📦 Importation des modules nécessaires
// ===============================================================
import User from "../models/User.js";
import { createToken, getCookieOptions } from "../utils/jwtUtil.js";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/email.js";

// --- Connexion de l'utilisateur ---

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({
        message: "Cette adresse email n'est associée à aucun compte.",
      });
    }

    // Vérifie le mot de passe (haché avec bcrypt)
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    if (!user.isActif) {
      return res.status(403).json({
        message:
          "Votre compte est désactivé. Veuillez contacter l'administrateur.",
      });
    }

    // 🔹 Vérifie si l'utilisateur doit changer son mot de passe
    if (user.doitChangerPassword) {
      return res.status(403).json({
        message: "Vous devez changer votre mot de passe avant de continuer.",
        userId: user.id, // on renvoie l'ID pour la réinitialisation
      });
    }

    const { password: _, ...userPublic } = user.get();

    const token = createToken(userPublic);
    res.cookie("jwt", token, getCookieOptions());

    res.status(200).json({
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

    // Inversion de l'état actif/inactif
    user.isActif = !user.isActif;
    await user.save();

    // --- Envoi de l'email de notification ---
    const sujet = user.isActif
      ? "Activation de votre compte ✅"
      : "Désactivation de votre compte ⚠️";
    const messageEmail = `
      <div style="font-family: sans-serif; line-height: 1.5; color: #333;">
        <p>Bonjour <strong>${user.prenom}</strong>,</p>
        <p>Nous vous informons que votre compte sur notre plateforme a été 
        <strong>${user.isActif ? "activé" : "désactivé"}</strong> par l'administrateur.</p>
        ${
          user.isActif
            ? `<p>Vous pouvez dès maintenant vous connecter ici : <a href="${process.env.FRONTEND_URL}/login" style="color: #007bff; text-decoration: none; font-weight: bold;">Accéder à mon compte</a></p>`
            : `<p>Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez obtenir plus d'informations, veuillez contacter le support.</p>`
        }
        <p>Cordialement,<br>L'équipe technique</p>
      </div>
    `;

    // Tentative d'envoi d'email sans bloquer la réponse API
    sendEmail(user.email, sujet, messageEmail).catch((err) =>
      console.error("Erreur envoi email toggleActive:", err.message),
    );

    res.status(200).json({
      message: `Utilisateur ${user.nom} ${user.prenom} ${user.isActif ? "activé" : "désactivé"} avec succès.`,
      isActif: user.isActif,
    });
  } catch (error) {
    console.error("❌ Erreur lors du changement d’état :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ===============================================================
// 👤 --- GET CURRENT USER (Profil) ---
// ===============================================================

export const profil = async (req, res) => {
  try {

    if (!req.user) {
      return res.status(401).json({ message: "Non autorisé" });
    }
    res.json(req.user);
  } catch (error) {
    console.error("Erreur profil:", error);
    res.status(500).json({ 
      message: "Erreur lors de la récupération du profil" 
    });
  }
};
