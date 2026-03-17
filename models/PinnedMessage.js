import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PinnedMessage = sequelize.define(
  "PinnedMessage",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    messageId: { type: DataTypes.INTEGER, allowNull: false },
    conversationId: { type: DataTypes.STRING, allowNull: false },
    pinnedBy: { type: DataTypes.INTEGER, allowNull: false },

    pinnedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    timestamps: true,
    tableName: "pinned_messages",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["messageId", "conversationId"],
      },
    ],
  },
);

export default PinnedMessage;
