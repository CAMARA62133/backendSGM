import mongoose from "mongoose";
const { Schema } = mongoose;

// ==============================
// 🔹 Schéma pour les notifications d’un utilisateur
// ==============================
const NotificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", // Référence à l'utilisateur destinataire de la notification
    required: true, // Champ obligatoire
  },
  message: {
    type: String,
    required: true, // Contenu de la notification, obligatoire
  },
  data: {
    type: Object, // Données supplémentaires (ex: id du message lié, type de notification, etc.)
  },
  lu: {
    type: Boolean,
    default: false, // Indique si la notification a été lue ou non (false par défaut)
  },
  createdAt: {
    type: Date,
    default: Date.now, // Date de création de la notification
  },
});

// 🔹 Export du modèle Notification
export default mongoose.model("Notification", NotificationSchema);
