import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const File = sequelize.define(
  "File",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    filename: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    mimetype: { type: DataTypes.STRING, allowNull: false },

    uploadedBy: { type: DataTypes.INTEGER, allowNull: false },
    conversationId: { type: DataTypes.STRING, allowNull: false },
  },
  {
    timestamps: true,
    tableName: "files",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
  },
);

export default File;
