// ===============================================================
// 📦 Connexion à PostgreSQL avec Sequelize + création admin
// ===============================================================

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import User from "../models/User.js"; // Assure-toi que le chemin est correct

// Charger les variables d'environnement
dotenv.config({ path: "./config/.env" });

// 🔹 Initialisation de Sequelize avec les variables d’environnement (.env)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
    define: {
      schema: process.env.DB_SCHEMA || "public",
    },
  }
);

// ===============================================================
// 🚀 Fonction de connexion
// ===============================================================
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connexion PostgreSQL réussie !");

    // Crée le schema si inexistant
    if (process.env.DB_SCHEMA) {
      await sequelize.query(
        `CREATE SCHEMA IF NOT EXISTS "${process.env.DB_SCHEMA}"`
      );
      console.log(`✅ Schema "${process.env.DB_SCHEMA}" vérifié / créé`);
    }

    // ⚡ Synchroniser les modèles AVANT d'utiliser les tables
    await sequelize.sync({ alter: true });
    console.log("✅ Tables synchronisées !");

    // Créer un admin si inexistant
    const adminEmail = "camarakarifadev@gmail.com";
    const adminExist = await User.findOne({ where: { email: adminEmail } });

    if (!adminExist) {
      const admin = await User.create({
        type: "admin",
        nom: "Camara",
        prenom: "Karifa",
        email: adminEmail,
        password: "Camara@123", // sera hashé automatiquement
        pays: "Guinée",
        region: "Mamou",
        etablissement: "TRV",
      });
      console.log("✅ Admin créé :", admin.email);
    } else {
      console.log("ℹ️ L'admin existe déjà :", adminExist.email);
    }
  } catch (error) {
    console.error("❌ Erreur :", error.message);
    process.exit(1);
  }
};

export { sequelize, connectDB };
