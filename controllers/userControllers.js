import fs from "fs";
import crypto from "crypto";
import XLSX from "xlsx";
import path from "path";
// ✅ Import centralisé pour garantir la cohérence des hooks et relations
import { User } from "../models/index.js";
import { sendEmail } from "../utils/email.js";

/**
 * --- CRÉER UN UTILISATEUR (Individuel) ---
 */
export const createUser = async (req, res) => {
  try {
    const { email, ...rest } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    // Génération d'un mot de passe temporaire lisible (8 caractères)
    const tempPassword = crypto.randomBytes(4).toString("hex");
    const photoPath = req.file ? `/uploads/photos/${req.file.filename}` : null;

    const user = await User.create({
      ...rest,
      email,
      password: tempPassword, // Le hook "beforeCreate" du modèle s'occupera du hashage
      photo: photoPath,
      doitChangerPassword: true,
      isActif: true,
    });

    const resetLink = `${process.env.FRONTEND_URL}/change-password?userId=${user.id}`;

    // Envoi de l'email de bienvenue
    await sendEmail(
      user.email,
      "Accès à votre compte SygmaHub ✅",
      `<div style="font-family: sans-serif;">
        <p>Bonjour <strong>${user.prenom}</strong>,</p>
        <p>Votre compte pro a été créé pour l'entreprise <strong>${user.entreprise || "SygmaHub"}</strong>.</p>
        <p><strong>Identifiants :</strong><br>
        Email : ${user.email}<br>
        Mot de passe temporaire : <code>${tempPassword}</code></p>
        <p>Veuillez <a href="${resetLink}">cliquer ici</a> pour définir votre mot de passe personnel.</p>
      </div>`,
    );

    res
      .status(201)
      .json({ success: true, message: "Utilisateur enregistré avec succès" });
  } catch (error) {
    console.error("Erreur createUser:", error);
    res.status(500).json({ message: "Erreur lors de la création" });
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

    const allowedFields = [
      "type",
      "secteur_activite",
      "nom",
      "prenom",
      "email",
      "telephone",
      "adresse",
      "pays",
      "pays_code",
      "region",
      "entreprise",
      "password",
      "isActif",
    ];

    const dataToUpdate = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) dataToUpdate[field] = req.body[field];
    });

    // Gestion du changement de photo
    if (req.file) {
      if (user.photo) {
        const oldPath = path.join(process.cwd(), "public", user.photo);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.error("Erreur unlink photo:", e);
          }
        }
      }
      dataToUpdate.photo = `/uploads/photos/${req.file.filename}`;
    }

    // Si le mot de passe est mis à jour manuellement par un admin, on peut forcer le changement
    if (dataToUpdate.password) {
      user.doitChangerPassword = true;
    }

    await user.update(dataToUpdate);
    res.json({ success: true, message: "Mise à jour réussie" });
  } catch (error) {
    console.error("Erreur updateUser:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour" });
  }
};

/**
 * --- RÉCUPÉRER TOUS LES UTILISATEURS ---
 */
export const getAllUsers = async (req, res) => {
  try {
    const loggedUser = req.user;
    let whereClause = {};

    // Restriction : un utilisateur standard ne voit que ses collègues
    if (loggedUser.type === "user") {
      whereClause.entreprise = loggedUser.entreprise;
    }

    const users = await User.findAll({
      where: whereClause,
      attributes: { exclude: ["password"] },
      order: [
        ["nom", "ASC"],
        ["prenom", "ASC"],
      ],
    });

    res.json({ success: true, users });
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

    if (user.photo) {
      const photoPath = path.join(process.cwd(), "public", user.photo);
      if (fs.existsSync(photoPath)) {
        try {
          fs.unlinkSync(photoPath);
        } catch (e) {
          console.error(e);
        }
      }
    }

    await user.destroy();
    res.json({ success: true, message: "Utilisateur supprimé avec succès." });
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

    if (userId) user = await User.findByPk(userId);
    else if (email) user = await User.findOne({ where: { email } });

    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    // Étape 1 : Vérification de l'existence (si pas de nouveau password fourni)
    if (!newPassword) {
      return res.status(200).json({
        success: true,
        message: "Utilisateur identifié.",
        userId: user.id,
      });
    }

    // Étape 2 : Mise à jour réelle
    user.password = newPassword; // Sera hashé par le hook beforeUpdate/beforeSave
    user.doitChangerPassword = false;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Mot de passe mis à jour avec succès." });
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
      if (!row.email) continue;

      const tempPassword = crypto.randomBytes(4).toString("hex");
      usersToCreate.push({
        ...row,
        type: row.type || "user",
        password: tempPassword,
        doitChangerPassword: true,
        isActif: true,
      });
      emailData.push({ email: row.email, prenom: row.prenom, tempPassword });
    }

    // Utilisation de individualHooks pour garantir le hashage des mots de passe temporaires
    const createdUsers = await User.bulkCreate(usersToCreate, {
      individualHooks: true,
      ignoreDuplicates: true,
    });

    // Envoi différé des emails pour ne pas bloquer l'import
    emailData.forEach((info) => {
      const resetLink = `${process.env.FRONTEND_URL}/change-password`;
      sendEmail(
        info.email,
        "Votre compte SygmaHub est prêt ✅",
        `<p>Bonjour ${info.prenom},</p>
         <p>Votre mot de passe temporaire est : <strong>${info.tempPassword}</strong></p>
         <p><a href="${resetLink}">Cliquez ici pour personnaliser votre accès.</a></p>`,
      ).catch((e) => console.error(`Email non envoyé à ${info.email}:`, e));
    });

    // Nettoyage du fichier temporaire
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      message: `${createdUsers.length} utilisateurs importés avec succès.`,
    });
  } catch (err) {
    console.error("Erreur Import:", err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: "Erreur lors de l'importation." });
  }
};
