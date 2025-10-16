// =========================
// utils/jwt.js
// =========================

// 📦 Importation du package JSON Web Token
const jwt = require("jsonwebtoken");

// ⏱️ Durée de validité du token : 3 jours (en secondes)
const maxAge = 3 * 24 * 60 * 60; // 3 jours = 3 * 24 heures * 60 minutes * 60 secondes

/**
 * 🔹 Fonction pour générer un token JWT
 * @param {String} id - L'ID de l'utilisateur à inclure dans le token
 * @returns {String} token - Le token JWT signé
 *
 * Le token contient l'ID de l'utilisateur et expire après `maxAge` secondes.
 * Le secret utilisé pour signer le token est défini dans `process.env.TOKEN_SECRET`.
 */
const createToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN_SECRET, { expiresIn: maxAge });
};

// =========================
// EXPORT
// =========================
// On exporte la fonction createToken et la constante maxAge pour pouvoir les utiliser ailleurs
module.exports = { createToken, maxAge };
