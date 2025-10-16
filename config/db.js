// ===============================================================
// 📦 Importation du module Mongoose
// ===============================================================

// Mongoose est une bibliothèque qui permet de gérer facilement
// les connexions et les interactions avec une base de données MongoDB.
import mongoose from "mongoose";

// ===============================================================
// ⚙️ Fonction asynchrone de connexion à MongoDB
// ===============================================================

// Cette fonction sera appelée au démarrage du serveur (dans server.js ou app.js)
// pour établir une connexion entre ton backend Node.js et la base de données MongoDB.
const connectDB = async () => {
  try {
    // ------------------------------------------------------------
    // 🧩 Configuration : désactiver strictQuery
    // ------------------------------------------------------------
    // Cette option permet d’éviter des avertissements liés aux requêtes
    // qui contiennent des champs non définis dans le schéma Mongoose.
    // En la mettant à "false", on conserve une compatibilité avec les versions récentes.
    mongoose.set("strictQuery", false);

    // ------------------------------------------------------------
    // 🌐 Connexion à la base de données MongoDB
    // ------------------------------------------------------------
    // La méthode connect() établit la connexion à MongoDB à partir
    // de l’URL définie dans le fichier .env (process.env.MONGO_URL).
    // Les options useNewUrlParser et useUnifiedTopology garantissent
    // une compatibilité avec les versions modernes de MongoDB.
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true, // Active le nouvel analyseur d’URL MongoDB
      useUnifiedTopology: true, // Utilise le nouveau moteur de gestion des connexions
    });

    // ------------------------------------------------------------
    // ✅ Message de confirmation en cas de succès
    // ------------------------------------------------------------
    console.log("✅ MongoDB connecté avec succès");
  } catch (e) {
    // ------------------------------------------------------------
    // ❌ Gestion des erreurs
    // ------------------------------------------------------------
    // Si la connexion échoue (mauvaise URL, serveur MongoDB inaccessible, etc.),
    // on capture l’erreur et on affiche un message explicite dans la console.
    console.error("❌ Erreur de connexion à MongoDB :", e.message);

    // process.exit(1) termine immédiatement le processus Node.js
    // avec un code d’erreur (1 = échec), pour éviter que le serveur
    // continue à tourner sans base de données.
    process.exit(1);
  }
};

// ===============================================================
// 🚀 Exportation de la fonction
// ===============================================================
// On exporte connectDB pour pouvoir l’utiliser ailleurs dans le projet,
// généralement dans server.js ou app.js (ex: connectDB(); avant app.listen()).
export default connectDB;
