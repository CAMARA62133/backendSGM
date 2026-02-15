import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";
import User from "./User.js";

class GroupUser extends Model {}

GroupUser.init(
  {
    role: {
      type: DataTypes.ENUM("owner", "member"),
      allowNull: false,
      defaultValue: "member",
    },
    // On définit explicitement les colonnes pour éviter le mélange GroupId / groupId
    GroupId: {
      type: DataTypes.INTEGER,
      references: { model: "groups", key: "id" },
      onDelete: "CASCADE",
    },
    UserId: {
      type: DataTypes.INTEGER,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "GroupUser",
    tableName: "GroupUsers",
    timestamps: true,
  },
);

class Group extends Model {}

Group.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  { sequelize, modelName: "Group", tableName: "groups", timestamps: true },
);

// --- Relations avec clés étrangères explicites ---
Group.belongsToMany(User, { through: GroupUser, foreignKey: "GroupId" });
User.belongsToMany(Group, { through: GroupUser, foreignKey: "UserId" });
Group.belongsTo(User, { as: "creator", foreignKey: "creatorId" });

export { GroupUser };
export default Group;
