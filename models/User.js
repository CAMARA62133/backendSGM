import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../config/db.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    type: {
      type: DataTypes.ENUM("admin", "user"),
      allowNull: false,
      defaultValue: "user",
    },

    secteur_activite: {
      type: DataTypes.STRING,
      defaultValue: "AUTRE",
    },

    nom: { type: DataTypes.STRING, allowNull: false },
    prenom: { type: DataTypes.STRING, allowNull: false },

    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },

    password: { type: DataTypes.STRING, allowNull: false },

    telephone: DataTypes.STRING,
    photo: DataTypes.STRING,

    isActif: { type: DataTypes.BOOLEAN, defaultValue: true },
    doitChangerPassword: { type: DataTypes.BOOLEAN, defaultValue: true },

    entreprise: DataTypes.STRING,
    adresse: DataTypes.STRING,
    pays: DataTypes.STRING,
    pays_code: DataTypes.STRING(2),
    region: DataTypes.STRING,
  },
  {
    timestamps: true,
    tableName: "users",
    schema: process.env.DB_SCHEMA || "public",
    freezeTableName: true,
  },
);

// 🔐 Hash password
User.beforeCreate(async (user) => {
  if (user.password) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

User.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// 🔑 Login method
User.login = async function (email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error("Email ou mot de passe incorrect");

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Email ou mot de passe incorrect");

  if (!user.isActif)
    throw new Error("Compte désactivé. Contactez l'administrateur.");

  return user;
};

export default User;
