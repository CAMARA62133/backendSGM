import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcrypt";
import User from "../models/User.js"; 

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
      password,
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
      !password ||
      !pays ||
      !region ||
      !etablissement
    ) {
      return res
        .status(400)
        .json({ message: "Veuillez remplir tous les champs obligatoires." });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({
          message: "Cet email est déjà utilisé par un autre utilisateur.",
        });
    }

    // Création de l'utilisateur
    const user = await User.create({
      type,
      nom,
      prenom,
      email,
      password,
      telephone,
      adresse,
      pays,
      region,
      etablissement,
      photo: req.file ? "/uploads/photos/" + req.file.filename : null,
    });

    res.status(201).json({
      message: "✅ Utilisateur créé avec succès.",
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
    const users = await User.findAll({ order: [["createdAt", "DESC"]] });
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
 * RESET PASSWORD
 * ==============================
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!newPassword)
      return res
        .status(400)
        .json({ message: "Veuillez fournir un nouveau mot de passe." });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email non trouvé." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

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
 */
export const importUsers = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ message: "Aucun fichier fourni." });

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const users = [];

for (const row of sheet) {
  if (
    !row.nom ||
    !row.prenom ||
    !row.password ||
    !row.pays ||
    !row.region ||
    !row.etablissement
  )
    continue;

  users.push({
    type: row.type || "user",
    nom: row.nom,
    prenom: row.prenom,
    email: row.email, // <-- IMPORTANT
    password: await bcrypt.hash(row.password, 10),
    telephone: row.telephone || "",
    adresse: row.adresse || "",
    pays: row.pays,
    region: row.region,
    etablissement: row.etablissement,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}


    await User.bulkCreate(users);

    res
      .status(201)
      .json({
        message: `${users.length} utilisateurs importés avec succès.`,
        count: users.length,
      });
  } catch (err) {
    console.error("❌ Erreur importUsers :", err);
    res
      .status(500)
      .json({ message: "Erreur lors de l'importation des utilisateurs." });
  }
};
