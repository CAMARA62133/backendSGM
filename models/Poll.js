import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Poll = sequelize.define(
  "Poll",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    question: { type: DataTypes.STRING, allowNull: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    groupId: { type: DataTypes.INTEGER, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "polls",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
  },
);

export const PollOption = sequelize.define(
  "PollOption",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    pollId: { type: DataTypes.INTEGER, allowNull: false },
    text: { type: DataTypes.STRING, allowNull: false },
    votes: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  {
    tableName: "poll_options",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
  },
);

export const PollVote = sequelize.define(
  "PollVote",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

    pollId: { type: DataTypes.INTEGER, allowNull: false },
    optionId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    tableName: "poll_votes",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
    indexes: [
      {
        unique: true,
        fields: ["pollId", "userId"],
      },
    ],
  },
);
