import mongoose from "mongoose";

// ==============================
// 🔹 Schéma pour les pièces jointes d'un message
// ==============================
const pieceJointeSchema = new mongoose.Schema({
  nom: String, // Nom du fichier
  chemin: String, // Chemin ou URL où le fichier est stocké
  typeMime: String, // Type MIME du fichier (ex: image/png, application/pdf)
  taille: Number, // Taille du fichier en octets
});

// ==============================
// 🔹 Schéma principal pour les messages
// ==============================
const messageSchema = new mongoose.Schema({
  sujet: {
    type: String,
    required: true, // Sujet obligatoire
    trim: true, // Supprime les espaces au début et à la fin
  },
  contenu: {
    type: String,
    required: true, // Contenu obligatoire
  },
  expediteur: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Référence à l'utilisateur qui envoie le message
    required: true,
  },
  destinataires: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Référence aux utilisateurs destinataires
      required: true,
    },
  ],
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message", // Référence au message parent pour gérer les threads/conversations
    default: null,
  },
  piecesJointes: [pieceJointeSchema], // Tableau de pièces jointes
  estBrouillon: {
    type: Boolean,
    default: false, // Indique si le message est un brouillon
  },
  estLu: {
    type: Boolean,
    default: false, // Indique si le message a été lu par le destinataire
  },
  estFavori: {
    type: Boolean,
    default: false, // Indique si le message est marqué comme favori
  },
  estArchive: {
    type: Boolean,
    default: false, // Indique si le message est archivé
  },
  estSupprime: {
    type: Boolean,
    default: false, // Indique si le message est supprimé
  },
  dateEnvoi: {
    type: Date,
    default: Date.now, // Date d'envoi du message
  },
  dateSuppression: {
    type: Date,
    default: null, // Date de suppression du message (null si non supprimé)
  },
});

// ==============================
// 🔹 Index pour améliorer les performances des requêtes
// ==============================
messageSchema.index({ expediteur: 1, dateEnvoi: -1 }); // Index pour les messages envoyés par utilisateur
messageSchema.index({ destinataires: 1, dateEnvoi: -1 }); // Index pour les messages reçus par utilisateur
messageSchema.index({ threadId: 1 }); // Index pour les threads/conversations

// Export du modèle Message
export default mongoose.model("Message", messageSchema);
