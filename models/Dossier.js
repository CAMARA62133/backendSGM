import mongoose from "mongoose";
const { Schema } = mongoose;

// ==============================
// 🔹 Schéma pour les fichiers
// ==============================
const FichierSchema = new Schema({
  nom: { type: String, required: true }, // Nom du fichier
  url: { type: String, required: true }, // Chemin ou URL où le fichier est stocké
  type: { type: String }, // Type de fichier (ex: PDF, image, Word, etc.)
  taille: { type: Number }, // Taille du fichier en octets
  proprietaire: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // Référence à l'utilisateur qui possède le fichier
  date_upload: { type: Date, default: Date.now }, // Date d'upload
});

// ==============================
// 🔹 Schéma pour les dossiers
// ==============================
const DossierSchema = new Schema(
  {
    nom: { type: String, required: true }, // Nom du dossier
    proprietaire: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Référence à l'utilisateur qui possède le dossier
    parent: { type: Schema.Types.ObjectId, ref: "Dossier", default: null },
    // Référence au dossier parent pour permettre la structure arborescente
    fichiers: [FichierSchema], // Tableau des fichiers contenus dans le dossier
    partage: [{ type: Schema.Types.ObjectId, ref: "User" }],
    // Liste des utilisateurs ayant accès au dossier (partage)
  },
  { timestamps: true } // Ajoute automatiquement createdAt et updatedAt
);

// Export du modèle "Dossier" pour l'utiliser dans les routes/controllers
export default mongoose.model("Dossier", DossierSchema);
