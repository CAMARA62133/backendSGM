import multer from "multer";
import path from "path";
import fs from "fs";

// Dossiers
const dirPhotos = "public/uploads/photos";
const dirFichiers = "public/uploads/fichiers";

// Création si inexistant
if (!fs.existsSync(dirPhotos)) fs.mkdirSync(dirPhotos, { recursive: true });
if (!fs.existsSync(dirFichiers)) fs.mkdirSync(dirFichiers, { recursive: true });

// Configuration du stockage dynamique
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".pdf") {
      cb(null, dirFichiers);
    } else {
      cb(null, dirPhotos);
    }
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Filtrage des fichiers
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(
      new Error(
        "Erreur : format de fichier non supporté ! (jpeg, jpg, png, pdf)"
      )
    );
  }
};

// Limite taille fichier : 5MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
