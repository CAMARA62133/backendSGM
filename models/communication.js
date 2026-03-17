import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class Communication extends Model {}

Communication.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    content: { type: DataTypes.TEXT, allowNull: false }, 
    channel: DataTypes.STRING,

    userId: { type: DataTypes.INTEGER, allowNull: false },
    recipientId: DataTypes.INTEGER,
    groupId: DataTypes.INTEGER,
    fileId: DataTypes.INTEGER,
    pollId: DataTypes.INTEGER,

    conversationId: { type: DataTypes.INTEGER, allowNull: false },

    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    isEdited: { type: DataTypes.BOOLEAN, defaultValue: false },

    hiddenBy: { type: DataTypes.JSON, defaultValue: [] },
  },
  {
    sequelize,
    modelName: "Communication",
    tableName: "communication",
    schema: process.env.DB_SCHEMA || "public",
    timestamps: true,
    freezeTableName: true,
  },
);

export default Communication;
