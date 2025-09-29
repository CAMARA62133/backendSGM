import User from "../models/User.js";
import { createToken, maxAge } from "../utils/jwtUtil.js";
// =========================
// --- LOGIN ---
// =========================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.login(email, password);

    const token = createToken(user._id);
    await user.save();

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
          id: user._id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          type: user.type,
          isActif: user.isActif,
        },
      });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// =========================
// --- LOGOUT ---
// =========================
export const logout = (req, res) => {
  try {
    res
      .clearCookie("jwt", { httpOnly: true, sameSite: "lax" })
      .status(200)
      .json({ message: "Déconnexion réussie." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =========================
// --- ACTIVER / DESACTIVER USER ---
// =========================
export const toggleActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    user.isActif = !user.isActif;
    await user.save();

    res.status(200).json({
      message: `Utilisateur ${user.nom} ${user.prenom} ${
        user.isActif ? "activé" : "désactivé"
      } avec succès.`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
