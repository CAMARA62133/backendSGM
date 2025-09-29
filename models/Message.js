import mongoose from "mongoose";

const { Schema } = mongoose;

// Schéma Messages
const MessageSchema = new Schema({
  expediteur_id: {
    type: Schema.Types.ObjectId,
    ref: "User", // nom exact du modèle User
    required: true,
  },
  destinataire_id: {
    type: Schema.Types.ObjectId,
    ref: "User", // nom exact du modèle User
    required: true,
  },
  objet: { type: String, required: true },
  contenu: { type: String, required: true },
  pieces_jointes: [
    {
      nom: String,
      url: String,
      date_upload: { type: Date, default: Date.now },
    },
  ],
  statut: {
    type: String,
    enum: ["envoye", "brouillon", "archive"],
    default: "brouillon",
  },
  date_envoi: { type: Date, default: Date.now },
});

export default mongoose.model("Message", MessageSchema);
