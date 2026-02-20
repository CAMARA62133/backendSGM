/**
 * ========================================
 * 📨 CONTROLEUR DES MESSAGES (Sequelize)
 * ========================================
 * Technologies : Node.js, Express.js, Sequelize
 * Auteur : Camara Karifa
 * Date : 2025
 */
import {
  Message,
  PieceJointe,
  MessageDestinataire,
} from "../models/Message.js";
import User from "../models/User.js";
import { Op } from "sequelize";
import { sendEmail } from "../utils/email.js";

// Convertir emails en IDs
const convertirEmailsEnIds = async (emails) => {
  if (!Array.isArray(emails)) {
    if (typeof emails === "string") {
      emails = emails.split(",").map((e) => e.trim());
    } else {
      emails = [emails];
    }
  }

  const users = await User.findAll({
    where: { email: { [Op.in]: emails } },
    attributes: ["id", "email"],
  });

  const ids = users.map((u) => u.id);
  const emailsInvalides = emails.filter(
    (e) => !users.some((u) => u.email === e)
  );

  return { ids, emailsInvalides };
};


/* ======================================================
   📤 ENVOYER MESSAGE AVEC GESTION RÉELLE DES BROUILLONS
====================================================== */
const envoyerMessage = async (req, res) => {
  try {
    const {
      sujet,
      contenu,
      destinataires,
      estBrouillon = false,
      threadId,
      mode,
      messageId, // ID du brouillon existant si édition
    } = req.body;

    // 🔹 Corriger le type de estBrouillon (multipart/form-data envoie tout en string)
    const estBrouillonBool = estBrouillon === true || estBrouillon === "true";

    let message;

    // ===============================
    // 1️⃣ Gestion brouillon
    // ===============================
    if (estBrouillonBool) {
      if (messageId) {
        // Mettre à jour un brouillon existant
        message = await Message.findByPk(messageId, {
          include: [{ model: PieceJointe, as: "piecesJointes" }],
        });
        if (!message)
          return res
            .status(404)
            .json({ success: false, message: "Brouillon introuvable" });

        await message.update({
          sujet,
          contenu,
          threadId: mode !== "new" ? threadId : null,
          estBrouillon: true,
          estEnvoye: false,
          dateEnvoi: null,
        });

        // Supprimer les destinataires existants pour éviter doublons
        await message.setDestinataires([], {
          through: { archive: false, supprime: false, favori: false },
        });
      } else {
        // Création d'un nouveau brouillon
        message = await Message.create({
          sujet,
          contenu,
          expediteurId: req.user.id,
          threadId: mode !== "new" ? threadId : null,
          estBrouillon: true,
          estEnvoye: false,
          dateEnvoi: null,
        });
      }

      // Ajouter les nouvelles pièces jointes
      if (req.files?.length > 0) {
        const pieces = req.files.map((file) => ({
          nom: file.originalname,
          chemin: file.path,
          typeMime: file.mimetype,
          taille: file.size,
          messageId: message.id,
        }));
        await PieceJointe.bulkCreate(pieces);
      }

      return res.status(201).json({
        success: true,
        message: "Brouillon sauvegardé",
        data: await Message.findByPk(message.id, {
          include: [{ model: PieceJointe, as: "piecesJointes" }],
        }),
      });
    }

    // ===============================
    // 2️⃣ Message envoyé
    // ===============================

    // Convertir emails en IDs
    const { ids: idsDestinataires, emailsInvalides } =
      await convertirEmailsEnIds(destinataires);
    if (emailsInvalides.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Certains destinataires n'existent pas",
        emailsInvalides,
      });
    }

    if (messageId) {
      // Envoyer un brouillon existant
      message = await Message.findByPk(messageId, {
        include: [{ model: PieceJointe, as: "piecesJointes" }],
      });
      if (!message)
        return res
          .status(404)
          .json({ success: false, message: "Brouillon introuvable" });

      // Mise à jour du brouillon pour l'envoyer
      await message.update({
        sujet,
        contenu,
        estBrouillon: false,
        estEnvoye: true,
        dateEnvoi: new Date(),
        threadId: mode !== "new" ? threadId : null,
      });

      // Supprimer les anciennes relations destinataires pour éviter doublons
      await message.setDestinataires([], {
        through: { archive: false, supprime: false, favori: false },
      });
    } else {
      // Nouveau message
      message = await Message.create({
        sujet,
        contenu,
        expediteurId: req.user.id,
        estBrouillon: false,
        estEnvoye: true,
        dateEnvoi: new Date(),
        threadId: mode !== "new" ? threadId : null,
      });
    }

    // Associer les destinataires
    await message.setDestinataires(idsDestinataires, {
      through: { archive: false, supprime: false, favori: false },
    });

    // Ajouter les nouvelles pièces jointes
    if (req.files?.length > 0) {
      const pieces = req.files.map((file) => ({
        nom: file.originalname,
        chemin: file.path,
        typeMime: file.mimetype,
        taille: file.size,
        messageId: message.id,
      }));
      await PieceJointe.bulkCreate(pieces);
    }

    // Charger message complet avec relations
    const messageAvecRelations = await Message.findByPk(message.id, {
      include: [
        { model: User, as: "expediteur" },
        { model: User, as: "destinataires" },
        { model: PieceJointe, as: "piecesJointes" },
      ],
    });

    // Envoyer email aux destinataires
    for (const idDest of idsDestinataires) {
      const destinataire = await User.findByPk(idDest);
      if (destinataire) {
        sendEmail(
          destinataire.email,
          `Nouveau message reçu: ${sujet}`,
          `<p>Bonjour ${destinataire.prenom},</p>
           <p>Vous avez reçu un nouveau message.</p>
           <p><strong>Sujet:</strong> ${sujet}</p>
           <p><strong>Contenu:</strong><br>${contenu}</p>
           <a href="${process.env.FRONTEND_URL}/messaging/message/${message.id}">
             Voir le message dans l'application
           </a>`
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: "Message envoyé avec succès",
      data: messageAvecRelations,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};




/* ======================================================
   📥 MESSAGES REÇUS
====================================================== */
const getMessagesRecus = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const archive = req.query.archive === "true";

    const { rows: messages, count: total } = await Message.findAndCountAll({
      include: [
        { model: User, as: "expediteur", attributes: ["id", "nom", "prenom", "email", "photo"] },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email", "photo"],
          where: { id: userId },
          required: true,
          through: { where: { archive, supprime: false } },
        },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => {
        const msg = m.toJSON();
        return { ...msg, destinataires: msg.destinataires || [], piecesJointes: msg.piecesJointes || [], expediteur: msg.expediteur || null };
      }),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   📤 MESSAGES ENVOYÉS
====================================================== */
const getMessagesEnvoyes = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { 
        expediteurId: req.user.id, 
        estBrouillon: false, 
        estSupprime: false, 
        estArchive: false 
      },
      include: [
        { model: User, as: "expediteur", attributes: ["nom", "prenom", "email", "photo"] },
        { model: User, as: "destinataires", attributes: ["nom", "prenom", "email", "photo"], through: { attributes: [] } },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => ({
        ...m.toJSON(),
        destinataires: m.destinataires || [],
        piecesJointes: m.piecesJointes || [],
        expediteur: m.expediteur || null
      })),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   📑 BROUILLONS
====================================================== */
const getBrouillons = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 20, 1);
    const offset = (page - 1) * limit;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { expediteurId: userId, estBrouillon: true, estSupprime: false },
      include: [
        { model: User, as: "destinataires", attributes: ["id", "nom", "prenom", "email"], through: { attributes: [] } },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => ({
        ...m.toJSON(),
        destinataires: m.destinataires || [],
        piecesJointes: m.piecesJointes || []
      })),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   🛠️ ARCHIVE / FAVORIS / CORBEILLE (Destinataire + Expéditeur)
====================================================== */
const toggleArchiveMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    // Vérifier si utilisateur est destinataire
    let pivot = await MessageDestinataire.findOne({ where: { userId, messageId } });
    if (pivot) {
      pivot.archive = !pivot.archive;
      await pivot.save();
      return res.json({ success: true, message: pivot.archive ? "Message archivé" : "Message désarchivé" });
    }

    // Vérifier si utilisateur est expéditeur
    const message = await Message.findOne({ where: { id: messageId, expediteurId: userId } });
    if (message) {
      message.estArchive = !message.estArchive;
      await message.save();
      return res.json({ success: true, message: message.estArchive ? "Message archivé" : "Message désarchivé" });
    }

    return res.status(403).json({ success: false, message: "Accès refusé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getMessagesArchives = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Messages archivés destinataire
    const archivedDest = await MessageDestinataire.findAll({ where: { userId, archive: true }, attributes: ["messageId"] });
    const archivedDestIds = archivedDest.map(a => a.messageId);

    // Messages archivés expéditeur
    const { rows: archivedExp, count: totalExp } = await Message.findAndCountAll({
      where: { expediteurId: userId, estArchive: true, estSupprime: false },
      attributes: ["id"]
    });
    const archivedExpIds = archivedExp.map(m => m.id);

    // Fusionner IDs
    const archivedIds = [...new Set([...archivedDestIds, ...archivedExpIds])];

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { id: { [Op.in]: archivedIds }, estSupprime: false },
      include: [
        { model: User, as: "expediteur", attributes: ["id", "nom", "prenom", "email", "photo"] },
        { model: User, as: "destinataires", attributes: ["id", "nom", "prenom", "email", "photo"], through: { attributes: [] } },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => ({ ...m.toJSON(), destinataires: m.destinataires || [], piecesJointes: m.piecesJointes || [], expediteur: m.expediteur || null })),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   🛠️ GESTION DES FAVORIS (CORRIGÉE)
====================================================== */

 const toggleFavori = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    // 1. Vérifier si l'utilisateur est un destinataire (table pivot)
    let pivot = await MessageDestinataire.findOne({ where: { userId, messageId } });
    if (pivot) {
      pivot.favori = !pivot.favori;
      await pivot.save();
      return res.json({ 
        success: true, 
        message: pivot.favori ? "Message ajouté aux favoris" : "Message retiré des favoris" 
      });
    }

    // 2. Vérifier si l'utilisateur est l'expéditeur (table principale)
    // Correction ici : on utilise "estFavori" au lieu de "favoriExpediteur"
    const message = await Message.findOne({ where: { id: messageId, expediteurId: userId } });
    if (message) {
      message.estFavori = !message.estFavori; 
      await message.save();
      return res.json({ 
        success: true, 
        message: message.estFavori ? "Message ajouté aux favoris" : "Message retiré des favoris" 
      });
    }

    return res.status(403).json({ success: false, message: "Accès refusé" });
  } catch (err) {
    console.error("Erreur toggleFavori:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getFavoris = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Messages favoris en tant que destinataire
    const favDest = await MessageDestinataire.findAll({ 
      where: { userId, favori: true }, 
      attributes: ["messageId"] 
    });
    const favDestIds = favDest.map(f => f.messageId);

    const favExp = await Message.findAll({ 
      where: { expediteurId: userId, estFavori: true }, 
      attributes: ["id"] 
    });
    const favExpIds = favExp.map(f => f.id);

    // Fusion des IDs uniques
    const favIds = [...new Set([...favDestIds, ...favExpIds])];

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { id: { [Op.in]: favIds }, estSupprime: false },
      include: [
        { model: User, as: "expediteur", attributes: ["id", "nom", "prenom", "email", "photo"] },
        { model: User, as: "destinataires", attributes: ["id", "nom", "prenom", "email", "photo"], through: { attributes: [] } },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => ({ 
        ...m.toJSON(), 
        destinataires: m.destinataires || [], 
        piecesJointes: m.piecesJointes || [], 
        expediteur: m.expediteur || null 
      })),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });

  } catch (err) {
    console.error("Erreur getFavoris:", err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};



/* ======================================================
   🗑️ CORBEILLE (Destinataire + Expéditeur)
====================================================== */
const supprimerMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    let pivot = await MessageDestinataire.findOne({ where: { userId, messageId } });
    if (pivot) {
      pivot.supprime = true;
      await pivot.save();
      return res.json({ success: true, message: "Message déplacé vers la corbeille" });
    }

    const message = await Message.findOne({ where: { id: messageId, expediteurId: userId } });
    if (message) {
      message.estSupprime = true;
      await message.save();
      return res.json({ success: true, message: "Message déplacé vers la corbeille" });
    }

    return res.status(403).json({ success: false, message: "Accès refusé" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const getCorbeille = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Corbeille destinataire
    const corbeilleDest = await MessageDestinataire.findAll({ where: { userId, supprime: true }, attributes: ["messageId"] });
    const corbeilleDestIds = corbeilleDest.map(c => c.messageId);

    // Corbeille expéditeur
    const corbeilleExp = await Message.findAll({ where: { expediteurId: userId, estSupprime: true }, attributes: ["id"] });
    const corbeilleExpIds = corbeilleExp.map(c => c.id);

    const corbeilleIds = [...new Set([...corbeilleDestIds, ...corbeilleExpIds])];

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { id: { [Op.in]: corbeilleIds } },
      include: [
        { model: User, as: "expediteur", attributes: ["id", "nom", "prenom", "email", "photo"] },
        { model: User, as: "destinataires", attributes: ["id", "nom", "prenom", "email", "photo"], through: { attributes: [] } },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true,
    });

    res.json({
      success: true,
      data: messages.map(m => ({ ...m.toJSON(), destinataires: m.destinataires || [], piecesJointes: m.piecesJointes || [], expediteur: m.expediteur || null })),
      pagination: { page, pages: Math.ceil(total / limit), total },
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const restaurerMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.id;

    let pivot = await MessageDestinataire.findOne({ where: { userId, messageId } });
    if (pivot) {
      pivot.supprime = false;
      await pivot.save();
      return res.json({ success: true, message: "Message restauré" });
    }

    const message = await Message.findOne({ where: { id: messageId, expediteurId: userId } });
    if (message) {
      message.estSupprime = false;
      await message.save();
      return res.json({ success: true, message: "Message restauré" });
    }

    return res.status(403).json({ success: false, message: "Accès refusé" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};




/* ======================================================
   🔎 DÉTAIL D'UN MESSAGE
   ====================================================== */
const getMessage = async (req, res) => {
  try {
    if (!req.user?.id)
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });

    const message = await Message.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email", "photo"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email", "photo"],
          through: {
            model: MessageDestinataire,
            attributes: ["lu", "favori", "archive", "supprime"], 
          },
        },
      ],
    });

    if (!message)
      return res
        .status(404)
        .json({ success: false, message: "Message non trouvé" });

    res.json({
      success: true,
      data: {
        ...message.toJSON(),
        destinataires: message.destinataires || [],
        piecesJointes: message.piecesJointes || [],
        expediteur: message.expediteur || null,
      },
    });
  } catch (error) {
    console.error("Erreur getMessage:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   🔎 TOUS LES MESSAGES (admin + directeur uniquement)
   ====================================================== */
const getAllMessages = async (req, res) => {
  try {
    const loggedUser = req.user;

    if (!loggedUser?.id) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié",
      });
    }

    let messages;

    /* ======================================================
       🟦 ADMIN → voit tous les messages
       ====================================================== */
    if (loggedUser.type === "admin") {
      messages = await Message.findAll({
        include: [
          {
            model: User,
            as: "expediteur",
            attributes: [
              "id",
              "nom",
              "prenom",
              "email",
              "photo",
              "etablissement",
            ],
          },
          {
            model: User,
            as: "destinataires",
            attributes: [
              "id",
              "nom",
              "prenom",
              "email",
              "photo",
              "etablissement",
            ],
            through: { attributes: [] },
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    } else if (loggedUser.type === "directeur") {
      /* ======================================================
       🟩 DIRECTEUR → messages de SON établissement
       ====================================================== */
      // On récupère tous les messages d'abord
      let allMessages = await Message.findAll({
        include: [
          {
            model: User,
            as: "expediteur",
            attributes: [
              "id",
              "nom",
              "prenom",
              "email",
              "photo",
              "etablissement",
            ],
          },
          {
            model: User,
            as: "destinataires",
            attributes: [
              "id",
              "nom",
              "prenom",
              "email",
              "photo",
              "etablissement",
            ],
            through: { attributes: [] },
          },
        ],
        order: [["createdAt", "DESC"]],
      });

      // Puis filtrage : garder seulement les messages de SON établissement
      messages = allMessages.filter((msg) => {
        const exp = msg.expediteur;
        const dests = msg.destinataires || [];

        return (
          exp?.etablissement === loggedUser.etablissement ||
          dests.some((d) => d.etablissement === loggedUser.etablissement)
        );
      });
    } else {
      // Aucun autre rôle n'a accès
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé",
      });
    }

    // Formatage final
    res.json({
      success: true,
      data: messages.map((msg) => ({
        ...msg.toJSON(),
        destinataires: msg.destinataires || [],
        piecesJointes: msg.piecesJointes || [],
        expediteur: msg.expediteur || null,
      })),
    });
  } catch (error) {
    console.error("Erreur getAllMessages :", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Fonction utilitaire pour formater la date en français
const formatDateFR = (date) =>
  date
    ? new Date(date).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date inconnue";

// Fonction pour ajouter une date formatée à un message
const formatMessageDates = (message) => {
  // S'assurer que le message est un objet simple (pas une instance Sequelize)
  const formattedMessage = message.toJSON ? message.toJSON() : message;

  // Ajout de la nouvelle propriété formatée
  formattedMessage.dateEnvoiFormatted = formatDateFR(
    formattedMessage.dateEnvoi
  );

  // Si vous voulez aussi formater l'heure seule pour la bulle (optionnel)
  formattedMessage.timeEnvoiFormatted = formattedMessage.dateEnvoi
    ? new Date(formattedMessage.dateEnvoi).toLocaleString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return formattedMessage;
};

/* ======================================================
    🔗 CONVERSATION / THREAD (final + format dates + PJ)
   ====================================================== */

const getConversation = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur non authentifié",
      });
    }

    const threadId = req.params.threadId;
    const BASE_URL = process.env.BASE_URL;

    /* ------------------------------------------------------
       1️⃣ Récupération du message principal
    --------------------------------------------------------- */
    const mainMessage = await Message.findByPk(threadId, {
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email", "photo"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email", "photo"],
          through: { attributes: [] },
        },
        { model: PieceJointe, as: "piecesJointes" },
      ],
    });

    if (!mainMessage) {
      return res.status(404).json({
        success: false,
        message: "Message principal non trouvé",
      });
    }

    /* ------------------------------------------------------
       🔧 Fonction formatage des PJ
    --------------------------------------------------------- */
    const formatPiecesJointes = (pieces) => {
      if (!pieces) return [];
      return pieces.map((pj) => ({
        ...pj.dataValues,
        // 1️⃣ remplacer backslashes par slash
        // 2️⃣ enlever 'public/uploads/' du chemin, car Express sert /uploads
        chemin: `${BASE_URL}/uploads/${pj.chemin
          .replace(/^public[\\/](uploads[\\/])?/, "")
          .replace(/\\/g, "/")}`,
      }));
    };

    /* ------------------------------------------------------
       🔧 Appliquer format PJ + dates au message principal
    --------------------------------------------------------- */
    const formattedMainMessage = formatMessageDates(mainMessage.toJSON());
    formattedMainMessage.piecesJointes = formatPiecesJointes(
      mainMessage.piecesJointes
    );

    /* ------------------------------------------------------
       2️⃣ Récupération des réponses du thread
    --------------------------------------------------------- */
    const reponses = await Message.findAll({
      where: { threadId },
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email", "photo"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email", "photo"],
          through: { attributes: [] },
        },
        { model: PieceJointe, as: "piecesJointes" },
      ],
      order: [["dateEnvoi", "ASC"]],
    });

    /* ------------------------------------------------------
       🔧 Formatage dates + PJ pour chaque réponse
    --------------------------------------------------------- */
    const formattedReponses = reponses.map((msg) => {
      const m = formatMessageDates(msg.toJSON());
      m.piecesJointes = formatPiecesJointes(msg.piecesJointes);
      return m;
    });

    /* ------------------------------------------------------
       3️⃣ Envoi final
    --------------------------------------------------------- */
    return res.json({
      success: true,
      data: {
        mainMessage: formattedMainMessage,
        reponses: formattedReponses,
        conversation: [formattedMainMessage, ...formattedReponses],
      },
    });
  } catch (error) {
    console.error("Erreur getConversation:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
};

/* ======================================================
   🗂️ GESTION CORBEILLE & FAVORIS & ARCHIVES
   ====================================================== */
// Fonction utilitaire pour le nouveau compte (à placer en dehors des fonctions de contrôleur)
const getUnreadCountForUser = async (userId) => {
  return await Message.count({
    include: [
      {
        model: User,
        as: "destinataires",
        where: { id: userId },
        required: true,
        through: { attributes: [] },
      },
    ],
    where: { estLu: false, estSupprime: false, estArchive: false },
  });
};

/* ======================================================
   🗂️ CORBEILLE / FAVORIS / ARCHIVES / SUPPRESSION
   ====================================================== */
const marquerCommeLu = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [{ model: User, as: "destinataires" }],
    });
    if (!message || !message.destinataires.some((d) => d.id === req.user.id))
      return res
        .status(404)
        .json({ success: false, message: "Message non trouvé" });

    message.estLu = true;
    await message.save();

    // 🌟 AJOUT : Calculer le nouveau nombre de non lus
    const newUnreadCount = await getUnreadCountForUser(req.user.id);
    // 🌟

    res.json({
      success: true,
      message: "Message marqué comme lu",
      newUnreadCount, // 🌟 AJOUT : Renvoyer le nouveau compte
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const marquerTousLus = async (req, res) => {
  try {
    // Note : La requête actuelle utilise un alias pour la jointure qui pourrait ne pas fonctionner
    // avec un `update` simple sur Message, car il ne crée pas la jointure 'destinataires'
    // correctement comme dans un find/count. Il est souvent plus sûr de :

    // 1. Trouver les IDs des messages non lus de l'utilisateur
    const unreadMessages = await Message.findAll({
      attributes: ["id"],
      where: { estLu: false },
      include: [
        {
          model: User,
          as: "destinataires",
          where: { id: req.user.id },
          required: true,
          through: { attributes: ["lu"] }, // Assurez-vous d'avoir une colonne 'lu' dans la pivot si 'estLu' n'est pas utilisé
        },
      ],
    });

    const unreadIds = unreadMessages.map((m) => m.id);

    if (unreadIds.length > 0) {
      await Message.update(
        { estLu: true },
        { where: { id: { [Op.in]: unreadIds } } }
      );
    }

    // 🌟 AJOUT : Le nouveau compte devrait être 0 si tout est marqué comme lu
    const newUnreadCount = 0; // Ou appeler getUnreadCountForUser(req.user.id) si vous voulez être super prudent, mais 0 est la logique ici

    res.json({
      success: true,
      message: "Tous les messages ont été marqués comme lus",
      newUnreadCount, // 🌟 AJOUT : Renvoyer le nouveau compte (qui devrait être 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const supprimerDefinitivement = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message)
      return res
        .status(404)
        .json({ success: false, message: "Message non trouvé" });

    await message.destroy();
    res.json({ success: true, message: "Message supprimé définitivement" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const viderCorbeille = async (req, res) => {
  try {
    await Message.destroy({ where: { estSupprime: true } });
    res.json({ success: true, message: "Corbeille vidée" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   📊 STATISTIQUES DES MESSAGES
   ====================================================== */

const nombreMessagesNonLus = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    // 🌟 UTILISATION de l'utilitaire
    const count = await getUnreadCountForUser(req.user.id);
    // 🌟

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreMessagesNonLus:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
const nombreBrouillons = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const count = await Message.count({
      where: {
        expediteurId: req.user.id,
        estBrouillon: true,
        estSupprime: false,
      },
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreBrouillons:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const nombreMessagesArchives = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const count = await Message.count({
      include: [
        {
          model: User,
          as: "destinataires",
          where: { id: req.user.id },
          required: true,
          through: { attributes: [] },
        },
      ],
      where: { estArchive: true, estSupprime: false },
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreMessagesArchives:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const nombreMessagesCorbeille = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    // Ici, on compte tous les messages supprimés liés à l'utilisateur
    const count = await Message.count({
      include: [
        {
          model: User,
          as: "destinataires",
          where: { id: req.user.id },
          required: false, // inclure même si pas destinataire direct
          through: { attributes: [] },
        },
      ],
      where: { estSupprime: true },
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreMessagesCorbeille:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const nombreMessagesFavoris = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const count = await Message.count({
      include: [
        {
          model: User,
          as: "destinataires",
          where: { id: req.user.id },
          required: false,
          through: { attributes: [] },
        },
      ],
      where: { estFavori: true, estSupprime: false },
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreMessagesFavoris:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   🚀 EXPORT DES FONCTIONS
   ====================================================== */
export {
  envoyerMessage,
  getMessagesRecus,
  getMessagesEnvoyes,
  getBrouillons,
  getFavoris,
  getMessagesArchives,
  getCorbeille,
  getMessage,
  getAllMessages,
  getConversation,
  toggleArchiveMessage,
  toggleFavori,
  marquerTousLus,
  marquerCommeLu,
  supprimerMessage,
  restaurerMessage,
  supprimerDefinitivement,
  viderCorbeille,
  nombreMessagesNonLus,
  nombreBrouillons,
  nombreMessagesArchives,
  nombreMessagesCorbeille,
  nombreMessagesFavoris,
};
