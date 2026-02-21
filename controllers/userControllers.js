// ==============================
// controllers/userControllers.js
// ==============================
import fs from "fs";
import crypto from "crypto";
import XLSX from "xlsx";
import User from "../models/User.js";
import { sendEmail } from "../utils/email.js";

/**
 * --- CRÉER UN UTILISATEUR (Individuel) ---
 * Génère un mot de passe temporaire et force le changement à la première connexion.
 */
export const createUser = async (req, res) => {
  try {
    const { email, ...rest } = req.body;

    // Vérification unicité
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    // Mot de passe temporaire & Photo
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const photoPath = req.file ? `/uploads/photos/${req.file.filename}` : null;

    const user = await User.create({
      ...rest,
      email,
      password: tempPassword, // Haché automatiquement par le modèle
      photo: photoPath,
      doitChangerPassword: true,
    });

    // Lien de redirection vers le frontend
    const resetLink = `${process.env.FRONTEND_URL}/change-password?userId=${user.id}`;

    await sendEmail(
      user.email,
      "Accès à votre compte ✅",
      `<p>Bonjour ${user.prenom},</p>
       <p>Votre compte a été créé par l'administrateur.</p>
       <p>Identifiants :<br>Email: <strong>${user.email}</strong><br>
       Mot de passe temporaire: <strong>${tempPassword}</strong></p>
       <p>Veuillez <a href="${resetLink}">cliquer ici</a> pour définir votre mot de passe personnel.</p>`,
    );

    res.status(201).json({ message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error("Erreur createUser:", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la création de l'utilisateur" });
  }
};

/**
 * --- METTRE À JOUR UN UTILISATEUR ---
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable" });

    // Filtrage des champs autorisés
    const allowedFields = [
      "type",
      "nom",
      "prenom",
      "email",
      "telephone",
      "adresse",
      "pays",
      "region",
      "etablissement",
      "password",
    ];

    const dataToUpdate = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) dataToUpdate[field] = req.body[field];
    });

    // Gestion de la photo (Suppression de l'ancienne si nouvelle)
    if (req.file) {
      if (user.photo && fs.existsSync(`./public${user.photo}`)) {
        try {
          fs.unlinkSync(`./public${user.photo}`);
        } catch (e) {
          console.error(e);
        }
      }
      dataToUpdate.photo = `/uploads/photos/${req.file.filename}`;
    }

    await user.update(dataToUpdate);

    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    res.json({ message: "Utilisateur mis à jour", user: updatedUser });
  } catch (error) {
    console.error("Erreur updateUser:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

/**
 * --- RÉCUPÉRER TOUS LES UTILISATEURS (Filtré par droits) ---
 */
export const getAllUsers = async (req, res) => {
  try {
    const loggedUser = req.user;
    let whereClause = {};

    // Restriction pour les directeurs
    if (loggedUser.type === "directeur") {
      whereClause.etablissement = loggedUser.etablissement;
    } else if (loggedUser.type !== "admin" && loggedUser.type !== "user") {
      return res.status(403).json({ message: "Accès non autorisé" });
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ["password"] },
      order: [["createdAt", "DESC"]],
    });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * --- RÉCUPÉRER PAR ID ---
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
    });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Utilisateur non trouvé." });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/**
 * --- SUPPRIMER ---
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé." });

    if (user.photo && fs.existsSync(`./public${user.photo}`)) {
      try {
        fs.unlinkSync(`./public${user.photo}`);
      } catch (e) {
        console.error(e);
      }
    }

    await user.destroy();
    res.json({ message: "Utilisateur supprimé avec succès." });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la suppression" });
  }
};

/**
 * --- CHANGER MOT DE PASSE (Public / Reset) ---
 */
export const changePassword = async (req, res) => {
  try {
    const { userId, email, newPassword } = req.body;
    let user;

    // Vérifier l'utilisateur par ID ou email
    if (userId) user = await User.findByPk(userId);
    else if (email) user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    // Si pas de nouveau mot de passe, c'est juste la vérification de l'existence
    if (!newPassword) {
      return res.status(200).json({
        message: "Utilisateur trouvé. Vous pouvez maintenant changer le mot de passe.",
        userId: user.id, // utile pour la prochaine étape
      });
    }

    // Sinon, on change le mot de passe
    user.password = newPassword;
    user.doitChangerPassword = false;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * --- IMPORT EXCEL ---
 */
export const importUsers = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Aucun fichier fourni." });

    const workbook = XLSX.readFile(req.file.path);
    const sheet = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]],
    );

    const usersToCreate = [];
    const emailData = [];

    for (const row of sheet) {
      if (!row.email || !row.nom) continue;

      const tempPassword = crypto.randomBytes(4).toString("hex");
      usersToCreate.push({
        ...row,
        type: row.type || "user",
        password: tempPassword,
        doitChangerPassword: true,
      });
      emailData.push({ email: row.email, prenom: row.prenom, tempPassword });
    }

    // Utilisation de individualHooks pour forcer le hachage via le modèle
    const createdUsers = await User.bulkCreate(usersToCreate, {
      individualHooks: true,
      ignoreDuplicates: true,
    });

    // Envoi des emails aux comptes réellement créés
    for (const info of emailData) {
      const resetLink = `${process.env.FRONTEND_URL}/change-password`;
      sendEmail(
        info.email,
        "Votre compte est prêt ✅",
        `<p>Bonjour ${info.prenom}, votre mot de passe temporaire est : <strong>${info.tempPassword}</strong>. <br> Changez-le ici : <a href="${resetLink}">Lien</a></p>`,
      );
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res
      .status(201)
      .json({ message: `${createdUsers.length} utilisateurs importés.` });
  } catch (err) {
    console.error("Erreur Import:", err);
    res.status(500).json({ message: "Erreur lors de l'importation." });
  }
};
