import { sequelize } from "../config/db.js";

import User from "./User.js";
import Communication from "./Communication.js";
import Group, { GroupUser } from "./group.js";
import File from "./File.js";
import DNDSettings from "./DNDSettings.js";
import PinnedMessage from "./PinnedMessage.js";
import { Poll, PollOption, PollVote } from "./Poll.js";
import ReadReceipt from "./ReadReceipt.js";
import { Message, PieceJointe, MessageDestinataire } from "./Message.js";

// ===============================================================
// 🔗 RELATIONS
// ===============================================================

// =========================
// User ↔ Communication
// =========================
User.hasMany(Communication, { foreignKey: "userId", as: "sentMessages" });
User.hasMany(Communication, {
  foreignKey: "recipientId",
  as: "receivedMessages",
});

// =========================
// User ↔ Poll
// =========================
User.hasMany(Poll, { foreignKey: "createdBy", as: "createdPolls" });
User.hasMany(PollVote, { foreignKey: "userId", as: "pollVotes" });

// =========================
// User ↔ File / DND / Pinned / ReadReceipt / Message
// =========================
User.hasMany(DNDSettings, { foreignKey: "userId", as: "dndSettings" });
User.hasMany(File, { foreignKey: "uploadedBy", as: "uploadedFiles" });
User.hasMany(PinnedMessage, { foreignKey: "pinnedBy", as: "pinnedMessages" });
User.hasMany(ReadReceipt, { foreignKey: "userId", as: "readReceipts" });
User.hasMany(Message, { foreignKey: "expediteurId", as: "messagesEnvoyes" });

// =========================
// User ↔ Group (Many-to-Many)
// =========================
User.belongsToMany(Group, {
  through: GroupUser,
  foreignKey: "userId",
  otherKey: "groupId",
  as: "groups",
});

Group.belongsToMany(User, {
  through: GroupUser,
  foreignKey: "groupId",
  otherKey: "userId",
  as: "members",
});

// =========================
// User ↔ Message (Many-to-Many)
// =========================
User.belongsToMany(Message, {
  through: MessageDestinataire,
  foreignKey: "userId",
  otherKey: "messageId",
  as: "messagesRecus",
});

// =========================
// Communication ↔ Relations
// =========================
Communication.belongsTo(User, { foreignKey: "userId", as: "user" });
Communication.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });
Communication.belongsTo(Group, { foreignKey: "groupId", as: "group" });
Communication.belongsTo(File, { foreignKey: "fileId", as: "file" });
Communication.belongsTo(Poll, { foreignKey: "pollId", as: "poll" });

// =========================
// Group ↔ Creator
// =========================
Group.belongsTo(User, { foreignKey: "creatorId", as: "creator" });

// =========================
// Poll
// =========================
Poll.belongsTo(User, { foreignKey: "createdBy", as: "creator" });
Poll.hasMany(PollOption, { foreignKey: "pollId", as: "options" });
PollOption.belongsTo(Poll, { foreignKey: "pollId" });
PollVote.belongsTo(User, { foreignKey: "userId", as: "user" });
PollVote.belongsTo(PollOption, { foreignKey: "optionId", as: "option" });

// =========================
// Message
// =========================
Message.belongsTo(User, { as: "expediteur", foreignKey: "expediteurId" });
Message.belongsToMany(User, {
  through: MessageDestinataire,
  as: "destinataires",
  foreignKey: "messageId",
  otherKey: "userId",
});
Message.hasMany(Message, { as: "reponses", foreignKey: "threadId" });
Message.belongsTo(Message, { as: "threadParent", foreignKey: "threadId" });
Message.hasMany(PieceJointe, { as: "piecesJointes", foreignKey: "messageId" });
PieceJointe.belongsTo(Message, { foreignKey: "messageId" });

// =========================
// Autres relations
// =========================
DNDSettings.belongsTo(User, { foreignKey: "userId" });
File.belongsTo(User, { foreignKey: "uploadedBy", as: "uploader" });
PinnedMessage.belongsTo(Communication, {
  foreignKey: "messageId",
  as: "message",
});
PinnedMessage.belongsTo(User, { foreignKey: "pinnedBy", as: "pinner" });
ReadReceipt.belongsTo(Communication, {
  foreignKey: "messageId",
  as: "message",
});
ReadReceipt.belongsTo(User, { foreignKey: "userId", as: "user" });

// ===============================================================
// 🔹 INIT DATABASE
// ===============================================================
export const initDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion PostgreSQL réussie");

    if (process.env.DB_SCHEMA) {
      await sequelize.createSchema(process.env.DB_SCHEMA, {
        ifNotExists: true,
      });
      console.log(`📁 Schéma actif : ${process.env.DB_SCHEMA}`);
    }

    console.log("⏳ Synchronisation des tables...");
    await User.sync({ alter: true });
    await Group.sync({ alter: true });
    await GroupUser.sync({ alter: true });
    await File.sync({ alter: true });
    await Poll.sync({ alter: true });
    await PollOption.sync({ alter: true });
    await PollVote.sync({ alter: true });
    await Communication.sync({ alter: true });
    await DNDSettings.sync({ alter: true });
    await Message.sync({ alter: true });
    await PieceJointe.sync({ alter: true });
    await MessageDestinataire.sync({ alter: true });
    await PinnedMessage.sync({ alter: true });
    await ReadReceipt.sync({ alter: true });
    console.log("✅ Toutes les tables sont synchronisées.");

    // Admin par défaut
    const adminEmail = "camarakarifadev@gmail.com";
    const adminExist = await User.findOne({ where: { email: adminEmail } });
    if (!adminExist) {
      await User.create({
        type: "admin",
        nom: "Camara",
        prenom: "Karifa",
        email: adminEmail,
        password: "Camara@123",
        telephone: "+224621000000",
        doitChangerPassword: false,
        isActif: true,
      });
      console.log("🚀 Admin créé :", adminEmail);
    } else {
      console.log("ℹ️ Admin déjà existant :", adminEmail);
    }
  } catch (error) {
    console.error("❌ Erreur init DB :", error);
    throw error;
  }
};

// ===============================================================
// 🔹 EXPORT GLOBAL
// ===============================================================
export {
  sequelize,
  User,
  Communication,
  Group,
  GroupUser,
  File,
  DNDSettings,
  PinnedMessage,
  Poll,
  PollOption,
  PollVote,
  ReadReceipt,
  Message,
  PieceJointe,
  MessageDestinataire,
};
