// ===============================================================
// 📦 Connexion à PostgreSQL avec Sequelize
// ===============================================================

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
// Charger les variables d'environnement AVANT utilisation 
dotenv.config({ path: "./config/.env" });
// 🔹 Initialisation de Sequelize avec les variables d’environnement (.env)
const sequelize = new Sequelize(
  process.env.DB_NAME, // Nom de la base de données
  process.env.DB_USER, // Nom d’utilisateur PostgreSQL
  process.env.DB_PASSWORD, // Mot de passe PostgreSQL
  {
    host: process.env.DB_HOST, // Adresse du serveur
    dialect: "postgres", // Type de SGBD
    port: process.env.DB_PORT || 5432, // Port PostgreSQL par défaut
    logging: false, // Désactiver les logs SQL dans la console
  }
);


// ===============================================================
// 🚀 Fonction de connexion
// ===============================================================
const connectDB = async () => {
  try {

    await sequelize.authenticate(); // Test de la connexion
    console.log("✅ Connexion PostgreSQL réussie !");
  } catch (error) {
    console.error("❌ Erreur de connexion à PostgreSQL :", error.message);
    process.exit(1); // Arrêt du serveur si échec
  }
};

export { sequelize, connectDB };
