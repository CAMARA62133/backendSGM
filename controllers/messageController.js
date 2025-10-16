/**
 * ========================================
 * 📨 CONTROLEUR DES MESSAGES
 * ========================================
 * Gère toutes les opérations liées à la messagerie :
 * - Envoi, réception et consultation de messages
 * - Gestion des brouillons, archives, favoris et corbeille
 * - Compteurs de statistiques
 *
 * Technologies : Node.js, Express.js, MongoDB (Mongoose)
 * Auteur : Camara Karifa
 * Date : 2025
 */

import Message from "../models/Message.js";
import User from "../models/User.js";
import mongoose from "mongoose";

/* ======================================================
   🧩 FONCTIONS UTILITAIRES
   ====================================================== */

/**
 * Convertit une liste d'adresses e-mail en IDs utilisateurs MongoDB.
 * - Recherche les utilisateurs existants par email.
 * - Renvoie la liste des IDs trouvés + les emails invalides.
 */
const convertirEmailsEnIds = async (emails) => {
  if (!Array.isArray(emails)) {
    // Si c'est une chaîne séparée par des virgules ("a@gmail.com,b@gmail.com")
    if (typeof emails === "string") {
      emails = emails.split(",").map((e) => e.trim());
    } else {
      emails = [emails];
    }
  }

  const users = await User.find({ email: { $in: emails } }).select("_id email");
  const ids = users.map((user) => user._id);
  const emailsInvalides = emails.filter(
    (email) => !users.some((user) => user.email === email)
  );

  return { ids, emailsInvalides, users };
};

// @desc    Envoyer un nouveau message
// @route   POST /api/messages
// @access  Privé
const envoyerMessage = async (req, res) => {
  try {
    const {
      sujet,
      contenu,
      destinataires,
      estBrouillon = false,
      threadId = null,
      mode = "new",
    } = req.body;

    // 🔸 Convertir les emails en IDs
    const { ids: idsDestinataires, emailsInvalides } =
      await convertirEmailsEnIds(destinataires);
    if (emailsInvalides.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Certains destinataires n'existent pas",
        emailsInvalides,
      });
    }

    // 📎 Gestion des pièces jointes
    const piecesJointes =
      req.files?.map((file) => ({
        nom: file.originalname,
        chemin: file.path,
        typeMime: file.mimetype,
        taille: file.size,
      })) || [];

    // ✅ Vérifier si le message est une vraie réponse
    let threadIdValide = null;
    if (
      (mode === "reply" || mode === "forward") &&
      threadId &&
      mongoose.Types.ObjectId.isValid(threadId)
    ) {
      threadIdValide = new mongoose.Types.ObjectId(threadId);
    }

    // 📬 Création du message
    const message = new Message({
      sujet,
      contenu,
      expediteur: req.user._id,
      destinataires: idsDestinataires,
      threadId: threadIdValide,
      estBrouillon,
      piecesJointes,
    });

    if (!estBrouillon) message.dateEnvoi = new Date();

    const messageCree = await message.save();
    await messageCree.populate("expediteur", "nom prenom email");
    await messageCree.populate("destinataires", "nom prenom email");

    res.status(201).json({
      success: true,
      message: estBrouillon
        ? "Brouillon sauvegardé"
        : "Message envoyé avec succès",
      data: messageCree,
    });
  } catch (error) {
    console.error("Erreur envoyerMessage:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer les messages reçus
// @route   GET /api/messages/recus
// @access  Privé
const getMessagesRecus = async (req, res) => {
  try {
    const { page = 1, limit = 20, archive = false } = req.query;

    const query = {
      destinataires: req.user._id, // Utilise l'ID pour la requête
      estSupprime: false,
      estArchive: archive === "true",
    };

    const messages = await Message.find(query)
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email")
      .sort({ dateEnvoi: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer les messages envoyés
// @route   GET /api/messages/envoyes
// @access  Privé
const getMessagesEnvoyes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
      expediteur: req.user._id, // Utilise l'ID pour la requête
      estBrouillon: false,
      estSupprime: false,
      estArchive: false,
    })
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email")
      .sort({ dateEnvoi: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      expediteur: req.user._id,
      estBrouillon: false,
      estSupprime: false,
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer les brouillons
// @route   GET /api/messages/brouillons
// @access  Privé
const getBrouillons = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
      expediteur: req.user._id, // Utilise l'ID pour la requête
      estBrouillon: true,
      estSupprime: false,
    })
      .populate("destinataires", "nom prenom email")
      .sort({ dateEnvoi: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      expediteur: req.user._id,
      estBrouillon: true,
      estSupprime: false,
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer un message par ID
// @route   GET /api/messages/:id
// @access  Privé
const getMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: false,
    })
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email");

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    // Marquer comme lu si l'utilisateur est destinataire
    if (
      message.destinataires.some(
        (dest) => dest._id.toString() === req.user._id.toString()
      ) &&
      !message.estLu
    ) {
      message.estLu = true;
      await message.save();
    }

    res.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// =========================
// 🗂️ GESTION DES MESSAGES - ACTIONS
// =========================

// @desc    Marquer un message comme lu
// @route   PUT /api/messages/:id/marquer-lu
// @access  Privé
const marquerCommeLu = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      destinataires: req.user._id, // Seul le destinataire peut marquer comme lu
      estSupprime: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    message.estLu = true;
    await message.save();

    res.json({
      success: true,
      message: "Message marqué comme lu",
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Archiver/Désarchiver un message
// @route   PUT /api/messages/:id/archive
// @access  Privé
const toggleArchiveMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    message.estArchive = !message.estArchive;
    await message.save();

    res.json({
      success: true,
      message: message.estArchive
        ? "Message archivé avec succès"
        : "Message désarchivé avec succès",
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Marquer comme favori
// @route   PUT /api/messages/:id/favori
// @access  Privé
const toggleFavori = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    message.estFavori = !message.estFavori;
    await message.save();

    res.json({
      success: true,
      message: message.estFavori
        ? "Message ajouté aux favoris"
        : "Message retiré des favoris",
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Marquer tous les messages comme lus
// @route   PUT /api/messages/marquer-lus
// @access  Privé
const marquerTousLus = async (req, res) => {
  try {
    await Message.updateMany(
      {
        destinataires: req.user._id,
        estLu: false,
        estSupprime: false,
      },
      {
        $set: { estLu: true },
      }
    );

    res.json({
      success: true,
      message: "Tous les messages ont été marqués comme lus",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// =========================
// 🗑️ GESTION DE LA CORBEILLE
// =========================

// @desc    Supprimer un message (corbeille)
// @route   PUT /api/messages/:id/supprimer
// @access  Privé
const supprimerMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: false,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé",
      });
    }

    message.estSupprime = true;
    message.dateSuppression = new Date();
    await message.save();

    res.json({
      success: true,
      message: "Message déplacé vers la corbeille",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Restaurer un message depuis la corbeille
// @route   PUT /api/messages/:id/restaurer
// @access  Privé
const restaurerMessage = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: true,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé dans la corbeille",
      });
    }

    message.estSupprime = false;
    message.dateSuppression = null;
    await message.save();

    res.json({
      success: true,
      message: "Message restauré",
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Supprimer définitivement un message
// @route   DELETE /api/messages/:id
// @access  Privé
const supprimerDefinitivement = async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: true,
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message non trouvé dans la corbeille",
      });
    }

    await Message.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      message: "Message supprimé définitivement",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Vider la corbeille
// @route   DELETE /api/messages/corbeille/vider
// @access  Privé
const viderCorbeille = async (req, res) => {
  try {
    await Message.deleteMany({
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: true,
    });

    res.json({
      success: true,
      message: "Corbeille vidée",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer la corbeille
// @route   GET /api/messages/corbeille
// @access  Privé
/**
 * Récupère tous les messages supprimés (Corbeille) pour l'utilisateur connecté.
 * L'utilisateur peut être soit l'expéditeur, soit un destinataire du message.
 */
const getCorbeille = async (req, res) => {
  try {
    // 2. Validate and parse pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // 3. Ensure the user is authenticated (req.user must be set by middleware)
    if (!req.user || !req.user._id) {
      // Correctly handle the case where authentication failed
      return res
        .status(401)
        .json({ success: false, message: "Authentification requise." });
    }
    const userId = req.user._id;

    // 4. Define the MongoDB query
    const query = {
      // The user must be either the sender OR one of the recipients
      $or: [
        { expediteur: userId },
        { destinataires: { $elemMatch: { $eq: userId } } },
      ],
      // AND the message must be marked as deleted (estSupprime: true)
      estSupprime: true,
    };

    // 5. Fetch messages with pagination and population
    const messages = await Message.find(query)
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email")
      .sort({ dateSuppression: -1 }) // Sort by most recently deleted
      .limit(limit)
      .skip((page - 1) * limit);

    // 6. Get the total count for pagination metadata
    const total = await Message.countDocuments(query);

    // 7. Send the success response
    res.json({
      success: true,
      data: messages,
      pagination: {
        page,
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    // 8. Log the detailed error (which causes the "Erreur serveur" message)
    console.error("Erreur getCorbeille:", error);
    // Send the generic 500 error response
    res.status(500).json({ success: false, message: "Erreur serveur interne" });
  }
};

// @desc    Récupérer une conversation (thread)
// @route   GET /api/messages/thread/:threadId
// @access  Privé
const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { threadId } = req.params;

    // 🔹 1. Message principal
    const mainMessage = await Message.findOne({
      _id: threadId,
      $or: [{ expediteur: userId }, { destinataires: userId }],
      estSupprime: false,
    })
      .populate("expediteur", "nom prenom email photo")
      .populate("destinataires", "nom prenom email photo");

    if (!mainMessage) {
      return res.status(404).json({
        success: false,
        message: "Message principal non trouvé",
      });
    }

    // 🔹 Convertir le chemin des pièces jointes en URL accessible
    if (mainMessage.piecesJointes && mainMessage.piecesJointes.length > 0) {
      mainMessage.piecesJointes = mainMessage.piecesJointes.map((pj) => {
        // Remplacer backslashes par slash et ajouter l'URL complète
        const url = pj.chemin.replace(/\\/g, "/").replace(/^public/, "");
        return {
          ...pj._doc, // garder les autres champs
          chemin: `http://localhost:3000${url}`,
        };
      });
    }

    // 🔹 2. Réponses associées à ce message
    const reponses = await Message.find({
      threadId: threadId,
      $or: [{ expediteur: userId }, { destinataires: userId }],
      estSupprime: false,
    })
      .populate("expediteur", "nom prenom email photo")
      .populate("destinataires", "nom prenom email photo")
      .sort({ dateEnvoi: 1 });

    // 🔹 Convertir les pièces jointes des réponses
    reponses.forEach((msg) => {
      if (msg.piecesJointes && msg.piecesJointes.length > 0) {
        msg.piecesJointes = msg.piecesJointes.map((pj) => {
          const url = pj.chemin.replace(/\\/g, "/").replace(/^public/, "");
          return {
            ...pj._doc,
            chemin: `http://localhost:5000${url}`,
          };
        });
      }
    });

    // 🔹 3. Fusion message principal + réponses
    const conversation = [mainMessage, ...reponses];

    res.json({
      success: true,
      data: {
        mainMessage,
        reponses,
        conversation,
      },
    });
  } catch (error) {
    console.error("Erreur getConversation:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// =========================
// 📊 STATISTIQUES
// =========================

// @desc    Compter les messages non lus
// @route   GET /api/messages/count-unread
// @access  Privé
const nombreMessagesNonLus = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      destinataires: req.user._id,
      estLu: false,
      estSupprime: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des messages non lus",
    });
  }
};

// @desc    Compter les brouillons
// @route   GET /api/messages/count-drafts
// @access  Privé
const nombreBrouillons = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      expediteur: req.user._id,
      estBrouillon: true,
      estSupprime: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul du nombre de brouillons",
    });
  }
};

// @desc    Compter les messages archivés
// @route   GET /api/messages/count-archived
// @access  Privé
const nombreMessagesArchives = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estArchive: true,
      estSupprime: false,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des messages archivés",
    });
  }
};

// @desc    Compter les messages en corbeille
// @route   GET /api/messages/count-trash
// @access  Privé
const nombreMessagesCorbeille = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estSupprime: true,
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des messages en corbeille",
    });
  }
};
// @desc    Compter les messages favoris
// @route   GET /api/messages/count-favorites
// @access  Privé
const nombreMessagesFavoris = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      $or: [
        { expediteur: req.user._id, estFavori: true, estSupprime: false },
        { destinataires: req.user._id, estFavori: true, estSupprime: false },
      ],
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des messages favoris",
    });
  }
};
// @desc    Récupérer les messages favoris
// @route   GET /api/messages/favoris
// @access  Privé
const getFavoris = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const messages = await Message.find({
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estFavori: true,
      estSupprime: false,
    })
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email")
      .sort({ dateEnvoi: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estFavori: true,
      estSupprime: false,
    });

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// @desc    Récupérer les messages archivés
// @route   GET /api/messages/archives
// @access  Privé
const getMessagesArchives = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const query = {
      $or: [{ expediteur: req.user._id }, { destinataires: req.user._id }],
      estArchive: true,
      estSupprime: false,
    };

    const messages = await Message.find(query)
      .populate("expediteur", "nom prenom email")
      .populate("destinataires", "nom prenom email")
      .sort({ dateEnvoi: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Exportez tous les contrôleurs
export {
  envoyerMessage,
  getMessagesRecus,
  getMessagesEnvoyes,
  getBrouillons,
  getFavoris,
  getMessagesArchives,
  getMessage,
  getConversation,
  marquerCommeLu, // ← NOUVEAU: Marquer comme lu
  toggleArchiveMessage,
  toggleFavori,
  marquerTousLus,
  supprimerMessage,
  restaurerMessage,
  supprimerDefinitivement,
  viderCorbeille,
  getCorbeille,
  nombreMessagesNonLus,
  nombreBrouillons,
  nombreMessagesArchives,
  nombreMessagesCorbeille,
  nombreMessagesFavoris,
};
