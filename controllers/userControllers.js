import fs from "fs"; // Module pour gérer les fichiers (lecture, suppression, etc.)
import XLSX from "xlsx"; // Module pour lire/écrire les fichiers Excel/CSV
import bcrypt from "bcrypt"; // Module pour le hachage des mots de passe
import User from "../models/User.js"; // Modèle Mongoose de l'utilisateur

/**
 * ==============================
 * CREATE USER
 * ==============================
 * Crée un nouvel utilisateur dans la base de données.
 * Vérifie les champs obligatoires et gère l'upload de photo.
 * Route : POST /api/users
 * Accès : Privé
 */
export const createUser = async (req, res) => {
  try {
    const {
      type,
      nom,
      prenom,
      password,
      telephone,
      adresse,
      pays,
      region,
      etablissement,
    } = req.body;

    // Validation minimale : tous les champs obligatoires doivent être présents
    if (
      !type ||
      !nom ||
      !prenom ||
      !password ||
      !pays ||
      !region ||
      !etablissement
    ) {
      return res.status(400).json({
        message: "Veuillez remplir tous les champs obligatoires.",
      });
    }

    // Création de l'objet utilisateur
    const user = new User({
      type,
      nom,
      prenom,
      password,
      telephone,
      adresse,
      pays,
      region,
      etablissement,
    });

    // Gestion de la photo uploadée
    if (req.file) {
      const ext = req.file.mimetype;
      if (ext.includes("jpeg") || ext.includes("jpg") || ext.includes("png")) {
        user.photo = "/uploads/photos/" + req.file.filename; // Stockage du chemin relatif
      }
    }

    await user.save(); // Enregistrement en DB

    res.status(201).json({
      message: "Utilisateur créé avec succès.",
      user,
    });
  } catch (err) {
    console.error("❌ Erreur createUser :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * UPDATE USER
 * ==============================
 * Met à jour les informations d'un utilisateur existant.
 * Gère également la suppression et remplacement de la photo.
 * Route : PUT /api/users/:id
 * Accès : Privé
 */
export const updateUser = async (req, res) => {
  try {
    const {
      nom,
      prenom,
      telephone,
      adresse,
      isActif,
      pays,
      region,
      etablissement,
    } = req.body;

    const user = await User.findById(req.params.id); // Recherche utilisateur par ID
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Mise à jour des champs si fournis
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    if (typeof isActif === "boolean") user.isActif = isActif;
    if (pays) user.pays = pays;
    if (region) user.region = region;
    if (etablissement) user.etablissement = etablissement;

    // Gestion du fichier photo uploadé
    if (req.file) {
      const ext = req.file.mimetype;
      if (ext.includes("jpeg") || ext.includes("jpg") || ext.includes("png")) {
        // Supprimer l'ancienne photo si elle existe
        if (user.photo && fs.existsSync("public" + user.photo)) {
          fs.unlinkSync("public" + user.photo);
        }
        user.photo = "/uploads/photos/" + req.file.filename;
      }
    }

    await user.save(); // Sauvegarde des modifications

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
 * Récupère tous les utilisateurs.
 * Route : GET /api/users
 * Accès : Privé
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }); // Tri décroissant par date de création
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
 * Récupère un utilisateur spécifique par son ID.
 * Route : GET /api/users/:id
 * Accès : Privé
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });
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
 * Supprime un utilisateur par son ID.
 * Supprime également la photo associée si elle existe.
 * Route : DELETE /api/users/:id
 * Accès : Privé
 */
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Suppression de la photo si existante
    if (user.photo && fs.existsSync("public" + user.photo)) {
      fs.unlinkSync("public" + user.photo);
    }

    await User.findByIdAndDelete(req.params.id); // Suppression en DB

    res.json({ message: "Utilisateur supprimé avec succès." });
  } catch (err) {
    console.error("❌ Erreur deleteUser :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * RESET PASSWORD
 * ==============================
 * Réinitialise le mot de passe d'un utilisateur via son email.
 * Route : POST /api/users/reset-password
 * Accès : Privé ou public selon la logique métier
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(404).json({ message: "Email non trouvé." });

    // Si aucun nouveau mot de passe fourni, seulement notifier
    if (!newPassword)
      return res.status(200).json({
        message: "Email trouvé. Entrez un nouveau mot de passe.",
      });

    user.password = newPassword;
    await user.save(); // Sauvegarde du nouveau mot de passe

    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });
  } catch (err) {
    console.error("❌ Erreur resetPassword :", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ==============================
 * IMPORT USERS FROM EXCEL/CSV
 * ==============================
 * Permet d'importer plusieurs utilisateurs depuis un fichier Excel ou CSV.
 * Route : POST /api/users/import
 * Accès : Privé
 */
export const importUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // Lecture du fichier Excel/CSV
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Première feuille
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const users = [];

    for (let row of sheet) {
      // Ignorer les lignes incomplètes
      if (
        !row.nom ||
        !row.prenom ||
        !row.password ||
        !row.pays ||
        !row.region ||
        !row.etablissement
      ) {
        continue;
      }

      // Hachage du mot de passe avant sauvegarde
      const hashedPassword = await bcrypt.hash(row.password, 10);

      // Création de l'objet utilisateur
      const user = new User({
        type: row.type || "user",
        nom: row.nom,
        prenom: row.prenom,
        password: hashedPassword,
        telephone: row.telephone || "",
        adresse: row.adresse || "",
        pays: row.pays,
        region: row.region,
        etablissement: row.etablissement,
      });

      await user.validate(); // Validation avant insertion
      users.push(user);
    }

    // Insertion en masse pour performance
    await User.insertMany(users);

    res.status(201).json({
      message: `${users.length} utilisateurs importés avec succès.`,
      count: users.length,
    });
  } catch (err) {
    console.error("Erreur import:", err);
    res
      .status(500)
      .json({ message: "Erreur lors de l'importation des utilisateurs." });
  }
};
