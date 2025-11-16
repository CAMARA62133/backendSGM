import fs from "fs";
import XLSX from "xlsx";
import crypto from "crypto";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js"; // ton utilitaire d'envoi d'email

/**
 * ==============================
 * CREATE USER
 * ==============================
 */
export const createUser = async (req, res) => {
  try {
    const {
      type,
      nom,
      prenom,
      email,
      telephone,
      adresse,
      pays,
      region,
      etablissement,
    } = req.body;

    // Vérification des champs obligatoires
    if (
      !type ||
      !nom ||
      !prenom ||
      !email ||
      !pays ||
      !region ||
      !etablissement
    ) {
      return res.status(400).json({
        message: "Veuillez remplir tous les champs obligatoires.",
      });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    // Génération d'un mot de passe temporaire (8 caractères)
    const tempPassword = crypto.randomBytes(4).toString("hex");

    // Création de l'utilisateur avec le mot de passe temporaire
    const user = await User.create({
      type,
      nom,
      prenom,
      email,
      password: tempPassword, // mot de passe temporaire
      telephone,
      adresse,
      pays,
      region,
      etablissement,
      photo: req.file ? "/uploads/photos/" + req.file.filename : null,
      doitChangerPassword: true, // ⚡ obliger l'utilisateur à changer le mot de passe
    });
    // Générer le lien de changement de mot de passe
    const resetLink = `${process.env.FRONTEND_URL}/change-password?userId=${user.id}`;
    // Envoyer l'email avec le mot de passe temporaire et le lien
    sendEmail(
      user.email,
      "Compte créé ✅",
      `<p>Bonjour ${user.prenom},</p>
       <p>Votre compte a été créé avec succès.</p>
       <p>Email: ${user.email}<br>Mot de passe temporaire: <strong>${tempPassword}</strong></p>
       <p>Veuillez <a href="${resetLink}">cliquer ici</a> pour définir votre nouveau mot de passe.</p>`
    );

    res.status(201).json({
      message:
        "Utilisateur créé avec succès. Un email a été envoyé avec vos identifiants.",
      user: { id: user.id, email: user.email, prenom: user.prenom },
    });
  } catch (err) {
    console.error("Erreur createUser :", err);
    res.status(500).json({ message: err.message });
  }
};



/**
 * ==============================
 * UPDATE USER
 * ==============================
 */
export const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });
 
    const {
      nom,
      prenom,
      telephone,
      adresse,
      isActif,
      pays,
      region,
      etablissement,
      password,
    } = req.body;

    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    if (typeof isActif === "boolean") user.isActif = isActif;
    if (pays) user.pays = pays;
    if (region) user.region = region;
    if (etablissement) user.etablissement = etablissement;
    if (password) user.password = await bcrypt.hash(password, 10);

    if (req.file) {
      // Supprimer ancienne photo
      if (user.photo && fs.existsSync("public" + user.photo))
        fs.unlinkSync("public" + user.photo);
      user.photo = "/uploads/photos/" + req.file.filename;
    }

    await user.save();

    res.json({ message: "Utilisateur mis à jour avec succès.", user });
  } catch (err) {
    console.error("❌ Erreur updateUser :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * GET ALL USERS
 * ==============================
 */
export const getAllUsers = async (req, res) => {
  try {
    const loggedUser = req.user; // vient de requireAuth

    let users;

    // ADMIN ou USER→ voit tout
    if (loggedUser.type === "admin" || loggedUser.type === "user") {
      users = await User.findAll({
        order: [["createdAt", "DESC"]],
      });
    }

    // DIRECTEUR → voit seulement son établissement
    else if (loggedUser.type === "directeur") {
      users = await User.findAll({
        where: { etablissement: loggedUser.etablissement },
        order: [["createdAt", "DESC"]],
      });
    }

    // AUTRE TYPE → accès refusé
    else {
      return res.status(403).json({
        message: "Accès non autorisé",
      });
    }

    res.json({ users });
  } catch (err) {
    console.error("❌ Erreur getAllUsers :", err);
    res.status(500).json({ message: err.message });
  }
};


/**
 * ==============================
 * GET USER BY ID
 * ==============================
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    res.json(user);
  } catch (err) {
    console.error("❌ Erreur getUserById :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * DELETE USER
 * ==============================
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    if (user.photo && fs.existsSync("public" + user.photo))
      fs.unlinkSync("public" + user.photo);

    await user.destroy();
    res.json({ message: "Utilisateur supprimé avec succès." });
  } catch (err) {
    console.error("❌ Erreur deleteUser :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * CHANGE / RESET PASSWORD (pré-save)
 * ==============================
 * 
 * Gestion du changement de mot de passe :
 * - Cas mot de passe temporaire : doitChangerPassword = true
 * - Cas mot de passe oublié : vérification email
 */
// POST /api/users/change-password
export const changePassword = async (req, res) => {
  try {
    const { userId, email, newPassword } = req.body;

    let user;

    // 1️⃣ Vérification email (étape 1)
    if (email && !newPassword && !userId) {
      const existingUser = await User.findOne({ where: { email } });
      if (!existingUser)
        return res.status(404).json({ message: "Email non trouvé." });

      return res.status(200).json({
        message:
          "Email vérifié. Vous pouvez maintenant changer votre mot de passe.",
      });
    }

    // 2️⃣ Cas changement de mot de passe (étape 2)
    if (!newPassword) {
      return res
        .status(400)
        .json({ message: "Veuillez fournir un nouveau mot de passe." });
    }

    if (userId) {
      user = await User.findByPk(userId);
      if (!user)
        return res.status(404).json({ message: "Utilisateur non trouvé." });
    } else if (email) {
      user = await User.findOne({ where: { email } });
      if (!user) return res.status(404).json({ message: "Email non trouvé." });
    } else {
      return res.status(400).json({
        message: "Aucun identifiant fourni pour changer le mot de passe.",
      });
    }

    // Mise à jour du mot de passe
    user.password = newPassword;

    if (user.doitChangerPassword) {
      user.doitChangerPassword = false;
    }

    await user.save();

    res.status(200).json({
      message: "Mot de passe mis à jour avec succès.",
    });
  } catch (err) {
    console.error("Erreur changePassword :", err);
    res.status(500).json({ message: err.message });
  }
};



/**
 * ==============================
 * IMPORT USERS FROM EXCEL/CSV
 * ==============================
 */
export const importUsers = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Aucun fichier fourni." });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const usersToCreate = [];
    const emailsSent = [];

    for (const row of sheet) {
      if (
        !row.nom ||
        !row.prenom ||
        !row.pays ||
        !row.region ||
        !row.etablissement
      )
        continue;

      // 🔹 Générer mot de passe temporaire
      const tempPassword = crypto.randomBytes(4).toString("hex"); // 8 caractères

      usersToCreate.push({
        type: row.type || "user",
        nom: row.nom,
        prenom: row.prenom,
        email: row.email, // important
        password: tempPassword, // stocker en clair pour pré-save (si c'est ton choix)
        doitChangerPassword: true, // ⚡ forcer changement du mot de passe
        telephone: row.telephone || "",
        adresse: row.adresse || "",
        pays: row.pays,
        region: row.region,
        etablissement: row.etablissement,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      emailsSent.push({ email: row.email, prenom: row.prenom, tempPassword });
    }

    // 🔹 Création en bulk
    const createdUsers = await User.bulkCreate(usersToCreate);

    // 🔹 Envoyer les emails avec lien de changement de mot de passe
    for (let i = 0; i < createdUsers.length; i++) {
      const user = createdUsers[i];
      const { tempPassword } = emailsSent[i];
      const resetLink = `${process.env.FRONTEND_URL}/change-password?userId=${user.id}`;

      sendEmail(
        user.email,
        "Compte créé ✅",
        `<p>Bonjour ${user.prenom},</p>
         <p>Votre compte a été créé avec succès.</p>
         <p>Email: ${user.email}<br>Mot de passe temporaire: <strong>${tempPassword}</strong></p>
         <p>Veuillez <a href="${resetLink}">cliquer ici</a> pour définir votre nouveau mot de passe.</p>`
      );
    }

    res.status(201).json({
      message: `${createdUsers.length} utilisateurs importés avec succès.`,
      count: createdUsers.length,
    });
  } catch (err) {
    console.error("❌ Erreur importUsers :", err);
    res
      .status(500)
      .json({ message: "Erreur lors de l'importation des utilisateurs." });
  }
};

