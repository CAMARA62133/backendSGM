import { DataTypes, Model } from "sequelize";
import { sequelize } from "../config/db.js";

class GroupUser extends Model {}

GroupUser.init(
  {
    role: {
      type: DataTypes.ENUM("owner", "member"),
      defaultValue: "member",
    },
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "groups", key: "id" },
      onDelete: "CASCADE",
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
  },
  {
    sequelize,
    modelName: "GroupUser",
    tableName: "group_users",
    schema: process.env.DB_SCHEMA || "public",
    timestamps: true,
    freezeTableName: true,
  },
);

class Group extends Model {}
Group.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    isPrivate: { type: DataTypes.BOOLEAN, defaultValue: false },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "Group",
    tableName: "groups",
    schema: process.env.DB_SCHEMA || "public",
    timestamps: true,
    freezeTableName: true,
  },
);
export { GroupUser };
export default Group;
