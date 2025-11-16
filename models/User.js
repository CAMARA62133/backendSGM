// ===============================================================
// 👤 Modèle User (Utilisateur)
// ===============================================================
import { DataTypes } from "sequelize";
import bcrypt from "bcrypt";
import { sequelize } from "../config/db.js";

// Définition du modèle utilisateur
const User = sequelize.define(
  "User",
  {
    type: {
      type: DataTypes.ENUM("admin", "directeur", "user"),
      allowNull: false,
    },
    nom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING,
    },
    isActif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    photo: {
      type: DataTypes.STRING,
    },
    adresse: {
      type: DataTypes.STRING,
    },
    pays: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    etablissement: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    doitChangerPassword: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    tableName: "users",
    schema: process.env.DB_SCHEMA, // <--- ajout du schema TRV_TMSG
  }
);

// ===============================================================
// 🔐 Hachage du mot de passe avant création ou mise à jour
// ===============================================================
User.beforeCreate(async (user) => {
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

User.beforeUpdate(async (user) => {
  if (user.changed("password")) {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
  }
});

// ===============================================================
// 🔑 Méthode personnalisée : connexion utilisateur
// ===============================================================
User.login = async function (email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error("Email ou mot de passe incorrect");

  const auth = await bcrypt.compare(password, user.password);
  if (!auth) throw new Error("Email ou mot de passe incorrect");

  if (!user.isActif)
    throw new Error("Compte désactivé. Contactez l'administrateur.");

  return user;
};

export default User;
