// Import du modèle Mongoose pour la collection "Dossier"
import Dossier from "../models/Dossier.js";

/**
 * 🗂️ Créer un nouveau dossier
 * @route POST /api/dossiers
 * @access Privé
 * Cette fonction permet à un utilisateur authentifié de créer un nouveau dossier.
 */
export const createDossier = async (req, res) => {
  try {
    const { nom, parent } = req.body;

    // Création d'une instance du dossier avec le propriétaire connecté
    const dossier = new Dossier({
      nom,
      proprietaire: req.user._id, // L'utilisateur qui crée le dossier
      parent: parent || null, // Si le dossier a un dossier parent (optionnel)
    });

    const savedDossier = await dossier.save(); // Sauvegarde en base de données
    res.status(201).json(savedDossier); // Réponse avec le dossier créé
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la création du dossier",
      error,
    });
  }
};

/**
 * 📁 Récupérer tous les dossiers d’un utilisateur
 * @route GET /api/dossiers
 * @access Privé
 * Retourne tous les dossiers appartenant à l'utilisateur connecté (avec arborescence).
 */
export const getDossiers = async (req, res) => {
  try {
    const dossiers = await Dossier.find({ proprietaire: req.user._id })
      .populate("parent", "nom") // Récupère le nom du dossier parent
      .populate("partage", "nom prenom email") // Récupère les infos des utilisateurs avec qui le dossier est partagé
      .sort({ createdAt: -1 }); // Trie du plus récent au plus ancien

    res.status(200).json(dossiers);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des dossiers",
      error,
    });
  }
};

/**
 * ✏️ Renommer un dossier
 * @route PUT /api/dossiers/:id
 * @access Privé
 * Permet au propriétaire du dossier de modifier son nom.
 */
export const renameDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom } = req.body;

    const dossier = await Dossier.findById(id);
    if (!dossier)
      return res.status(404).json({ message: "Dossier introuvable" });

    // Vérifie que seul le propriétaire peut renommer
    if (dossier.proprietaire.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    dossier.nom = nom; // Mise à jour du nom
    await dossier.save();

    res.status(200).json(dossier);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du renommage du dossier",
      error,
    });
  }
};

/**
 * 🗑️ Supprimer un dossier
 * @route DELETE /api/dossiers/:id
 * @access Privé
 * Permet au propriétaire de supprimer définitivement un dossier.
 */
export const deleteDossier = async (req, res) => {
  try {
    const { id } = req.params;

    const dossier = await Dossier.findById(id);
    if (!dossier)
      return res.status(404).json({ message: "Dossier introuvable" });

    // Vérifie que seul le propriétaire peut supprimer
    if (dossier.proprietaire.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    await dossier.deleteOne();
    res.status(200).json({ message: "Dossier supprimé avec succès" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du dossier",
      error,
    });
  }
};

/**
 * 📎 Ajouter un fichier dans un dossier
 * @route POST /api/dossiers/:dossierId/fichiers
 * @access Privé
 * Permet d’ajouter un fichier à un dossier appartenant à l’utilisateur.
 */
export const addFichier = async (req, res) => {
  try {
    const { dossierId } = req.params;
    const { nom, url, type, taille } = req.body;

    const dossier = await Dossier.findById(dossierId);
    if (!dossier)
      return res.status(404).json({ message: "Dossier introuvable" });

    // Vérifie que le propriétaire est bien l'utilisateur connecté
    if (dossier.proprietaire.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    // Création d'un objet fichier
    const fichier = { nom, url, type, taille, proprietaire: req.user._id };

    dossier.fichiers.push(fichier); // Ajout du fichier dans la liste
    await dossier.save();

    res.status(201).json(dossier);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de l'ajout du fichier",
      error,
    });
  }
};

/**
 * ❌ Supprimer un fichier d’un dossier
 * @route DELETE /api/dossiers/:dossierId/fichiers/:fichierId
 * @access Privé
 * Permet au propriétaire du fichier ou du dossier de le supprimer.
 */
export const deleteFichier = async (req, res) => {
  try {
    const { dossierId, fichierId } = req.params;

    const dossier = await Dossier.findById(dossierId);
    if (!dossier)
      return res.status(404).json({ message: "Dossier introuvable" });

    // Trouve l’index du fichier à supprimer
    const fichierIndex = dossier.fichiers.findIndex(
      (f) => f._id.toString() === fichierId
    );
    if (fichierIndex === -1)
      return res.status(404).json({ message: "Fichier introuvable" });

    // Vérifie les autorisations : seul le propriétaire du fichier ou du dossier peut le supprimer
    if (
      dossier.fichiers[fichierIndex].proprietaire.toString() !==
        req.user._id.toString() &&
      dossier.proprietaire.toString() !== req.user._id.toString()
    )
      return res.status(403).json({ message: "Accès non autorisé" });

    // Supprime le fichier de la liste
    dossier.fichiers.splice(fichierIndex, 1);
    await dossier.save();

    res.status(200).json(dossier);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression du fichier",
      error,
    });
  }
};

/**
 * 🤝 Partager un dossier avec un autre utilisateur
 * @route PUT /api/dossiers/:id/partager
 * @access Privé
 * Permet au propriétaire d’un dossier de le partager avec un autre utilisateur.
 */
export const partagerDossier = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const dossier = await Dossier.findById(id);
    if (!dossier)
      return res.status(404).json({ message: "Dossier introuvable" });

    // Vérifie que seul le propriétaire peut partager
    if (dossier.proprietaire.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    // Évite les doublons de partage
    if (!dossier.partage.includes(userId)) {
      dossier.partage.push(userId);
      await dossier.save();
    }

    res.status(200).json(dossier);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors du partage du dossier",
      error,
    });
  }
};
