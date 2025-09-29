import mongoose from "mongoose";

const { Schema } = mongoose;

// Schéma Élève
const EleveSchema = new Schema({
  nom: { type: String, required: true },
  prenom: { type: String, required: true },
  matricule: { type: String, required: true, unique: true },
  date_naissance: { type: Date, required: true },
  classe: { type: String, required: true },
  enseignant_id: {
    type: Schema.Types.ObjectId,
    ref: "User", 
    required: true,
  },
  adresse: { type: String },
  email: { type: String },
  telephone: { type: String },
  documents_scolaires: [
    {
      nom: String,
      url: String,
      date_upload: { type: Date, default: Date.now },
    },
  ],
  date_creation: { type: Date, default: Date.now },
});

export default mongoose.model("Eleve", EleveSchema);
