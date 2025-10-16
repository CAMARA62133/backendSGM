import multer from "multer"; // Middleware pour gérer l'upload de fichiers
import path from "path"; // Module pour gérer les chemins de fichiers
import fs from "fs"; // Module pour interagir avec le système de fichiers

// ==============================
// 📂 Définition des dossiers de stockage
// ==============================
const dirPhotos = "public/uploads/photos"; // Dossier pour les images
const dirFichiersPDF = "public/uploads/fichiers/pdf"; // Dossier pour les PDF
const dirFichiersExcel = "public/uploads/fichiers/excel"; // Dossier pour les fichiers Excel/CSV

// Crée les dossiers s'ils n'existent pas
[dirPhotos, dirFichiersPDF, dirFichiersExcel].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==============================
// 🔹 Configuration du stockage avec multer
// ==============================
const storage = multer.diskStorage({
  // Détermine le dossier de destination en fonction de l'extension du fichier
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase(); // extension du fichier
    if (ext === ".pdf") cb(null, dirFichiersPDF);
    else if (ext === ".xlsx" || ext === ".csv") cb(null, dirFichiersExcel);
    else cb(null, dirPhotos); // Par défaut, c'est pour les images
  },
  // Détermine le nom du fichier enregistré
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// ==============================
// 🔹 Filtrage des fichiers acceptés
// ==============================
const fileFilter = (req, file, cb) => {
  // Extensions autorisées
  const allowedTypes = /jpeg|jpg|png|pdf|xlsx|csv/;

  // Vérifie si l'extension et le mimetype correspondent aux types autorisés
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype || extname) cb(null, true); // fichier accepté
  else
    cb(
      new Error(
        "Erreur : format de fichier non supporté ! (jpeg, jpg, png, pdf, xlsx, csv)"
      )
    ); // fichier refusé
};

// ==============================
// 🔹 Limite de taille des fichiers : 5MB
// ==============================
const upload = multer({
  storage, // stockage configuré ci-dessus
  fileFilter, // filtre de fichiers
  limits: { fileSize: 5 * 1024 * 1024 }, // taille maximale : 5MB
});

// Export du middleware pour utilisation dans les routes
export default upload;
