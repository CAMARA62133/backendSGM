import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js"; // Modèle utilisateur

// ==============================
// 🔹 Modèle pour les pièces jointes d'un message
// ==============================
const PieceJointe = sequelize.define(
  "PieceJointe",
  {
    nom: { type: DataTypes.STRING },
    chemin: { type: DataTypes.STRING },
    typeMime: { type: DataTypes.STRING },
    taille: { type: DataTypes.INTEGER },
  },
  {
    timestamps: false,
    tableName: "pieces_jointes",
    schema: process.env.DB_SCHEMA,
  }
);

// ==============================
// 🔹 Modèle principal pour les messages
// ==============================
const Message = sequelize.define(
  "Message",
  {
    sujet: { type: DataTypes.STRING, allowNull: false },
    contenu: { type: DataTypes.TEXT, allowNull: false },
    estBrouillon: { type: DataTypes.BOOLEAN, defaultValue: false },
    estenvoye: { type: DataTypes.BOOLEAN, defaultValue: false },
    estLu: { type: DataTypes.BOOLEAN, defaultValue: false },
    estFavori: { type: DataTypes.BOOLEAN, defaultValue: false },
    estArchive: { type: DataTypes.BOOLEAN, defaultValue: false },
    estSupprime: { type: DataTypes.BOOLEAN, defaultValue: false },
    dateEnvoi: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
    dateSuppression: { type: DataTypes.DATE, defaultValue: null },
  },
  { timestamps: true, tableName: "messages", schema: process.env.DB_SCHEMA }
);

// ==============================
// 🔹 Relations
// ==============================

// Expéditeur : un utilisateur peut envoyer plusieurs messages
Message.belongsTo(User, { as: "expediteur", foreignKey: "expediteurId" });
User.hasMany(Message, { as: "messagesEnvoyes", foreignKey: "expediteurId" });

// Destinataires : relation N-N
const MessageDestinataire = sequelize.define(
  "MessageDestinataire",
  {
    lu: { type: DataTypes.BOOLEAN, defaultValue: false },
    favori: { type: DataTypes.BOOLEAN, defaultValue: false },
    archive: { type: DataTypes.BOOLEAN, defaultValue: false },
    supprime: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    timestamps: false,
    tableName: "messages_destinataires",
    schema: process.env.DB_SCHEMA,
  }
);

Message.belongsToMany(User, {
  through: MessageDestinataire,
  as: "destinataires",
  foreignKey: "messageId",
  otherKey: "userId",
});
User.belongsToMany(Message, {
  through: MessageDestinataire,
  as: "messagesRecus",
  foreignKey: "userId",
  otherKey: "messageId",
});

// Thread : un message peut être lié à un message parent
Message.belongsTo(Message, { as: "threadParent", foreignKey: "threadId" });
Message.hasMany(Message, { as: "reponses", foreignKey: "threadId" });

// Pièces jointes : un message peut avoir plusieurs pièces jointes
Message.hasMany(PieceJointe, { as: "piecesJointes", foreignKey: "messageId" });
PieceJointe.belongsTo(Message, { foreignKey: "messageId" });

export { Message, PieceJointe, MessageDestinataire };
export default Message;
