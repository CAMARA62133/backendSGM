// ===============================================================
// 📦 Connexion à PostgreSQL avec Sequelize + création admin
// ===============================================================

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import User from "../models/User.js"; // chemin correct vers le modèle

dotenv.config({ path: "./config/.env" });

// 🔹 Initialisation de Sequelize
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
      schema: process.env.DB_SCHEMA || "public", // schema
    },
  }
);

// ===============================================================
// 🚀 Fonction de connexion et setup
// ===============================================================
const connectDB = async () => {
  try {
    await sequelize.authenticate();
 

    // Crée le schema si inexistant
    if (process.env.DB_SCHEMA) {
      await sequelize.query(
        `CREATE SCHEMA IF NOT EXISTS "${process.env.DB_SCHEMA}"`
      );
      
    }

    // ⚡ Synchroniser les modèles AVANT d'utiliser les tables
    await sequelize.sync({ force: false, alter: true });
 

    // 🔐 Créer l'admin si inexistant
    const adminEmail = "camarakarifadev@gmail.com";
    const adminExist = await User.findOne({ where: { email: adminEmail } });

    if (!adminExist) {
      const admin = await User.create({
        type: "admin",
        nom: "Camara",
        prenom: "Karifa",
        email: adminEmail,
        password: "Camara@123", 
        pays: "Guinée",
        region: "Mamou",
        etablissement: "TRV",
        doitChangerPassword:false,
      });
      console.log("✅ Admin créé :", admin.email);
    } else {
      console.log("ℹ️ L'admin existe déjà :", adminExist.email);
    }
  } catch (error) {
    console.error("❌ Erreur :", error);
    process.exit(1);
  }
};

export { sequelize, connectDB };
