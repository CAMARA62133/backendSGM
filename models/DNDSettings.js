import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const DNDSettings = sequelize.define(
  "DNDSettings",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    userId: { type: DataTypes.INTEGER, allowNull: false },

    conversationId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "null = paramètres globaux",
    },

    enabled: { type: DataTypes.BOOLEAN, defaultValue: false },

    schedule: {
      type: DataTypes.STRING,
      comment: 'Format: "22-08"',
    },

    keywords: { type: DataTypes.JSON, defaultValue: [] },
    autoReply: DataTypes.TEXT,
  },
  {
    timestamps: true,
    tableName: "dnd_settings",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "conversationId"],
      },
    ],
  },
);

export default DNDSettings;
