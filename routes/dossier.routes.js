import express from "express";
import {
  createDossier,
  getDossiers,
  renameDossier,
  deleteDossier,
  addFichier,
  deleteFichier,
  partagerDossier,
} from "../controllers/dossierController.js";
import { requireAuth } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// ==============================
// 🔹 Middleware global : requireAuth
// ------------------------------
// Toutes les routes suivantes nécessitent que l'utilisateur soit authentifié
router.use(requireAuth);

// ==============================
// 🔹 ROUTES DOSSIERS
// ==============================

// Créer un nouveau dossier
// Méthode : POST
// URL : /api/dossiers/
// Description : Crée un dossier pour l'utilisateur connecté
router.post("/", createDossier);

// Récupérer tous les dossiers
// Méthode : GET
// URL : /api/dossiers/
// Description : Retourne tous les dossiers appartenant à l'utilisateur connecté
router.get("/", getDossiers);

// Renommer un dossier existant
// Méthode : PUT
// URL : /api/dossiers/:id/rename
// Param : id → ID du dossier à renommer
// Description : Modifie le nom d'un dossier spécifique
router.put("/:id/rename", renameDossier);

// Supprimer un dossier
// Méthode : DELETE
// URL : /api/dossiers/:id
// Param : id → ID du dossier à supprimer
// Description : Supprime un dossier et tous ses fichiers associés
router.delete("/:id", deleteDossier);

// ==============================
// 🔹 ROUTES FICHIERS
// ==============================

// Ajouter un fichier dans un dossier
// Méthode : POST
// URL : /api/dossiers/:dossierId/fichiers
// Param : dossierId → ID du dossier où ajouter le fichier
// Description : Upload et associe un fichier à un dossier
router.post("/:dossierId/fichiers", addFichier);

// Supprimer un fichier d'un dossier
// Méthode : DELETE
// URL : /api/dossiers/:dossierId/fichiers/:fichierId
// Param : dossierId → ID du dossier
// Param : fichierId → ID du fichier à supprimer
// Description : Supprime un fichier spécifique d'un dossier
router.delete("/:dossierId/fichiers/:fichierId", deleteFichier);

// ==============================
// 🔹 ROUTE PARTAGE
// ==============================

// Partager un dossier avec d'autres utilisateurs
// Méthode : PUT
// URL : /api/dossiers/:id/partager
// Param : id → ID du dossier à partager
// Description : Ajoute des utilisateurs au champ "partage" d'un dossier
router.put("/:id/partager", partagerDossier);

// ==============================
// 🔹 Export du routeur
// ==============================
export default router;
