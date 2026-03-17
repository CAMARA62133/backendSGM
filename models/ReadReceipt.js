import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const ReadReceipt = sequelize.define(
  "ReadReceipt",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    messageId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },

    readAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    timestamps: true,
    tableName: "read_receipts",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["messageId", "userId"],
      },
    ],
  },
);

export default ReadReceipt;
