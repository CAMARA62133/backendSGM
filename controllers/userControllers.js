// controllers/userControllers.js
import fs from "fs";
import User from "../models/User.js";

// ===== CREATE USER =====
export const createUser = async (req, res) => {
  try {
    const { type, nom, prenom, email, password, telephone, adresse } = req.body;
    let { enseignant, parent } = req.body;

    // Vérifie si l'email existe déjà
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email déjà utilisé" });

    // Création de l'objet user selon type
    const userData = { type, nom, prenom, email, password, telephone, adresse };

    if (type === "enseignant") {
      // On garde uniquement les champs enseignants
      userData.enseignant = {
        matricule: enseignant?.matricule || "",
        specialite: enseignant?.specialite || "",
        documents_administratifs: [],
      };
    } else if (type === "parent") {
      // On garde uniquement les champs parent
      if (!parent?.eleve_id)
        return res
          .status(400)
          .json({ message: "Un parent doit avoir un eleve_id" });
      userData.parent = { eleve_id: parent.eleve_id };
    }

    const user = new User(userData);

    // Gestion fichier uploadé
    if (req.file) {
      const ext = req.file.mimetype;

      if (ext.includes("pdf") && type === "enseignant") {
        user.enseignant.documents_administratifs.push({
          nom: req.file.originalname,
          url: "/uploads/fichiers/" + req.file.filename,
        });
      } else if (
        ext.includes("jpeg") ||
        ext.includes("jpg") ||
        ext.includes("png")
      ) {
        user.photo = "/uploads/photos/" + req.file.filename;
      }
    }

    await user.save();
    res.status(201).json({ message: "User créé", user });
  } catch (err) {
    console.error("❌ Erreur createUser :", err);
    res.status(500).json({ message: err.message });
  }
};

// ===== UPDATE USER =====
export const updateUser = async (req, res) => {
  try {
    const { nom, prenom, telephone, adresse, enseignant, parent, isActif } =
      req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User non trouvé" });

    // Mise à jour des champs généraux
    if (nom) user.nom = nom;
    if (prenom) user.prenom = prenom;
    if (telephone) user.telephone = telephone;
    if (adresse) user.adresse = adresse;
    if (typeof isActif === "boolean") user.isActif = isActif;

    // Mise à jour selon type
    if (user.type === "enseignant" && enseignant) {
      user.enseignant = { ...user.enseignant, ...enseignant };
    } else if (user.type === "parent" && parent) {
      user.parent = { ...user.parent, ...parent };
    }

    // Gestion du fichier uploadé
    if (req.file) {
      const ext = req.file.mimetype;

      if (ext.includes("pdf") && user.type === "enseignant") {
        if (user.enseignant.documents_administratifs.length > 0) {
          const lastDoc = user.enseignant.documents_administratifs.at(-1);
          if (lastDoc && fs.existsSync("public" + lastDoc.url)) {
            fs.unlinkSync("public" + lastDoc.url);
          }
          user.enseignant.documents_administratifs.pop();
        }
        user.enseignant.documents_administratifs.push({
          nom: req.file.originalname,
          url: "/uploads/fichiers/" + req.file.filename,
        });
      } else if (
        ext.includes("jpeg") ||
        ext.includes("jpg") ||
        ext.includes("png")
      ) {
        if (user.photo && fs.existsSync("public" + user.photo)) {
          fs.unlinkSync("public" + user.photo);
        }
        user.photo = "/uploads/photos/" + req.file.filename;
      }
    }

    await user.save();
    res.json({ message: "User mis à jour", user });
  } catch (err) {
    console.error("❌ Erreur updateUser :", err);
    res.status(500).json({ message: err.message });
  }
};

// ===== GET ALL USERS =====
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error("❌ Erreur getAllUsers :", err);
    res.status(500).json({ message: err.message });
  }
};

// ===== GET USER BY ID =====
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User non trouvé" });
    res.json(user);
  } catch (err) {
    console.error("❌ Erreur getUserById :", err);
    res.status(500).json({ message: err.message });
  }
};

// ===== DELETE USER =====
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User non trouvé" });

    // Supprimer photo
    if (user.photo && fs.existsSync("public" + user.photo)) {
      fs.unlinkSync("public" + user.photo);
    }

    // Supprimer documents administratifs si enseignant
    if (
      user.type === "enseignant" &&
      user.enseignant.documents_administratifs.length > 0
    ) {
      user.enseignant.documents_administratifs.forEach((doc) => {
        if (fs.existsSync("public" + doc.url)) {
          fs.unlinkSync("public" + doc.url);
        }
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    console.error("❌ Erreur deleteUser :", err);
    res.status(500).json({ message: err.message });
  }
};
