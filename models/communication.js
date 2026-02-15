import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js";
import Group from "./group.js";

class Communication extends Model {}

Communication.init(
  {
    content: { type: DataTypes.STRING, allowNull: false },
    channel: { type: DataTypes.STRING, allowNull: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    recipientId: { type: DataTypes.INTEGER, allowNull: true },
    groupId: { type: DataTypes.INTEGER, allowNull: true },
    // 🟢 AJOUT : État de lecture pour les badges de notification
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Communication",
    tableName: "communication",
    timestamps: true,
  },
);

// Associations
Communication.belongsTo(User, { foreignKey: "userId", as: "user" });
Communication.belongsTo(User, { foreignKey: "recipientId", as: "recipient" });
Communication.belongsTo(Group, { foreignKey: "groupId", as: "group" });
User.hasMany(Communication, { foreignKey: "userId", as: "messages" });

export default Communication;
