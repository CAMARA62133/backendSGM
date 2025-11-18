import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js";

class Group extends Model {}

Group.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
  },
  { sequelize, modelName: "Group", tableName: "groups", timestamps: true }
);

// Relation Many-to-Many avec les utilisateurs
Group.belongsToMany(User, { through: "GroupUsers" });
User.belongsToMany(Group, { through: "GroupUsers" });

// Relation pour le créateur
Group.belongsTo(User, { as: "creator", foreignKey: "creatorId" });

export default Group;
