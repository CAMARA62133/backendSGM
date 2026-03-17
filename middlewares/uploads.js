import multer from "multer";
import path from "path";
import fs from "fs";

// ==============================
// 📂 Définition des dossiers de stockage
// ==============================
const dirPhotos = "public/uploads/photos"; // Dossier pour les images
const dirFichiersPDF = "public/uploads/fichiers/pdf"; // Dossier pour les PDF
const dirFichiersExcel = "public/uploads/fichiers/excel"; // Dossier pour les fichiers Excel/CSV
const dirChatFiles = "public/uploads/chat-files"; // Dossier pour les fichiers du chat (protégé)

// Crée les dossiers s'ils n'existent pas
[dirPhotos, dirFichiersPDF, dirFichiersExcel, dirChatFiles].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ==============================
// 🔹 Configuration du stockage avec multer
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Vérifier si c'est une requête de chat (présence de conversationId)
    if (req.body.conversationId) {
      cb(null, dirChatFiles);
    } else if (ext === ".pdf") cb(null, dirFichiersPDF);
    else if (ext === ".xlsx" || ext === ".csv") cb(null, dirFichiersExcel);
    else cb(null, dirPhotos);
  },
  filename: (req, file, cb) => {
    if (req.body.conversationId) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    } else {
      cb(
        null,
        file.fieldname + "-" + Date.now() + path.extname(file.originalname),
      );
    }
  },
});

// ==============================
// 🔹 Filtrage des fichiers acceptés
// ==============================
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|csv|txt|zip/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype || extname) cb(null, true);
  else
    cb(
      new Error(
        "Erreur : format de fichier non supporté ! (jpeg, jpg, png, gif, pdf, doc, docx, xls, xlsx, csv, txt, zip)",
      ),
    );
};

// ==============================
// 🔹 Middleware pour les photos/profils (5MB)
// ==============================
export const uploadProfile = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ==============================
// 🔹 Middleware pour les fichiers du chat (50MB)
// ==============================
export const uploadChat = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ==============================
// 🔹 Middleware générique (par défaut 5MB)
// ==============================
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export default upload;
