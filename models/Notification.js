import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js"; // Modèle User existant

// ==============================
// 🔹 Modèle Notification
// ==============================
const Notification = sequelize.define(
  "Notification",
  {
    message: {
      type: DataTypes.STRING,
      allowNull: false, // message obligatoire
    },
    data: {
      type: DataTypes.JSONB, // stocke les données supplémentaires (objet JSON)
      allowNull: true,
    },
    lu: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // par défaut non lu
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: false, // createdAt géré manuellement, pas besoin de updatedAt
    tableName: "notifications",
    schema: process.env.DB_SCHEMA, // <--- ajout du schema TRV_TMSG
  }
);

// ==============================
// 🔹 Relations
// ==============================

// Chaque notification appartient à un utilisateur
Notification.belongsTo(User, { as: "user", foreignKey: "userId" });
User.hasMany(Notification, { as: "notifications", foreignKey: "userId" });

export default Notification;
