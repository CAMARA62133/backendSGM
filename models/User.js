import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema } = mongoose;

// ==============================
// 🔹 Schéma utilisateur
// ==============================
const UserSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["admin", "directeur", "user"], // Rôles possibles
      required: true,
    },
    nom: { type: String, required: true }, // Nom de l'utilisateur
    prenom: { type: String, required: true }, // Prénom de l'utilisateur
    email: { type: String, required: true, unique: true }, // Email unique, généré automatiquement si non fourni
    password: { type: String, required: true, select: false }, // Mot de passe, non sélectionné par défaut
    telephone: { type: String }, // Numéro de téléphone
    isActif: { type: Boolean, default: true }, // Statut actif/inactif
    photo: { type: String }, // Chemin vers la photo de profil
    adresse: { type: String }, // Adresse physique
    pays: { type: String, required: true }, // Pays
    region: { type: String, required: true }, // Région ou ville
    etablissement: { type: String, required: true }, // Nom de l'établissement (ex : Université)
  },
  { timestamps: true } // Ajoute createdAt et updatedAt automatiquement
);

// ==============================
// 🔹 Génération automatique de l'email avant validation
// ==============================
UserSchema.pre("validate", async function (next) {
  if (!this.email) {
    // Fonction pour normaliser le texte : enlever accents, espaces et mettre en minuscule
    const formatTexte = (str) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

    const prenoms = this.prenom.split(" ").map(formatTexte).join("-");
    const nom = formatTexte(this.nom);

    // Génération du domaine à partir du nom de l'établissement
    const domaine = formatTexte(this.etablissement).replace(/[^a-z0-9-]/g, "");
    let email = `${prenoms}.${nom}@${domaine}.com`;

    // Vérifie si l'email existe déjà
    let emailExiste = await mongoose.models.User.findOne({ email });
    if (emailExiste) {
      const random = Math.floor(Math.random() * 10000); // Ajoute un numéro aléatoire pour éviter les doublons
      email = `${prenoms}.${nom}${random}@${domaine}.com`;
    }

    this.email = email; // Attribue l'email généré
  }
  next();
});

// ==============================
// 🔐 Hachage du mot de passe avant sauvegarde
// ==============================
UserSchema.pre("save", async function (next) {
  // Ne hache que si le mot de passe est modifié ou nouveau
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ==============================
// 🔑 Méthode de connexion personnalisée
// ==============================
UserSchema.statics.login = async function (email, password) {
  // Recherche utilisateur et récupère le mot de passe
  const user = await this.findOne({ email }).select("+password");
  if (!user) throw new Error("Email ou mot de passe incorrect");

  // Vérifie le mot de passe
  const auth = await bcrypt.compare(password, user.password);
  if (!auth) throw new Error("Email ou mot de passe incorrect");

  // Vérifie si le compte est actif
  if (!user.isActif)
    throw new Error("Compte désactivé. Contactez l'administrateur.");

  return user; // Retourne l'utilisateur si tout est ok
};

// 🔹 Export du modèle
export default mongoose.model("User", UserSchema);
