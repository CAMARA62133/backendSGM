/**
 * ========================================
 * 📨 CONTROLEUR DES MESSAGES (Sequelize)
 * ========================================
 * Technologies : Node.js, Express.js, Sequelize
 * Auteur : Camara Karifa
 * Date : 2025
 */
import Message from "../models/Message.js";
import User from "../models/User.js";
import { Op } from "sequelize";
/* ======================================================
   🧩 FONCTIONS UTILITAIRES
   ====================================================== */
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
    (email) => !users.some((user) => user.email === email)
  );

  return { ids, emailsInvalides, users };
};

/* ======================================================
   📨 ENVOI DE MESSAGE
   ====================================================== */
const envoyerMessage = async (req, res) => {
  try {
    const { sujet, contenu, destinataires, estBrouillon = false, threadId = null, mode = "new" } = req.body;

    const { ids: idsDestinataires, emailsInvalides } = await convertirEmailsEnIds(destinataires);
    if (emailsInvalides.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Certains destinataires n'existent pas",
        emailsInvalides,
      });
    }

    const piecesJointes = req.files?.map(file => ({
      nom: file.originalname,
      chemin: file.path,
      typeMime: file.mimetype,
      taille: file.size,
    })) || [];

    const messageCree = await Message.create({
      sujet,
      contenu,
      expediteurId: req.user.id,
      threadId: mode === "reply" || mode === "forward" ? threadId : null,
      estBrouillon,
      piecesJointes,
      dateEnvoi: estBrouillon ? null : new Date(),
    });

    await messageCree.setDestinataires(idsDestinataires);

    const messageAvecRelations = await Message.findByPk(messageCree.id, {
      include: [
        { model: User, as: "expediteur", attributes: ["nom","prenom","email","photo"] },
        { model: User, as: "destinataires", attributes: ["nom","prenom","email","photo"] },
      ],
    });
    res.status(201).json({
      success: true,
      message: estBrouillon ? "Brouillon sauvegardé" : "Message envoyé avec succès",
      data: messageAvecRelations,
    });
  } catch (error) {
    console.error("Erreur envoyerMessage:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

/* ======================================================
   📥 MESSAGES REÇUS, ENVOYÉS, BROUILLONS
   ====================================================== */
const getMessagesRecus = async (req, res) => {
  try {
    if (!req.user?.id) return res.status(401).json({ success:false, message:"Utilisateur non authentifié" });

    const page = parseInt(req.query.page)||1;
    const limit = parseInt(req.query.limit)||20;
    const archive = req.query.archive === "true";

    const { rows: messages, count: total } = await Message.findAndCountAll({
      include: [
        { model: User, as: "expediteur", attributes:["id","nom","prenom","email","photo"] },
        { model: User, as: "destinataires", attributes:["id","nom","prenom","email","photo"], where:{id:req.user.id}, required:true, through:{attributes:[]}},
      ],
      where:{ estSupprime:false, estArchive:archive },
      order:[["dateEnvoi","DESC"]],
      limit,
      offset:(page-1)*limit,
      distinct:true,
    });

    res.json({
      success:true,
      data: messages.map(m=>({...m.toJSON(), destinataires:m.destinataires||[], piecesJointes:m.piecesJointes||[], expediteur:m.expediteur||null})),
      pagination:{page, pages:Math.ceil(total/limit), total},
    });
  } catch (error) {
    console.error("Erreur getMessagesRecus:", error);
    res.status(500).json({ success:false, message:"Erreur serveur" });
  }
};

const getMessagesEnvoyes = async (req,res)=>{
  try {
    const page = parseInt(req.query.page)||1;
    const limit = parseInt(req.query.limit)||20;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where:{ expediteurId:req.user.id, estBrouillon:false, estSupprime:false, estArchive:false },
      include:[
        { model: User, as:"expediteur", attributes:["nom","prenom","email","photo"] },
        { model: User, as:"destinataires", attributes:["nom","prenom","email","photo"], through:{attributes:[]} },
      ],
      order:[["dateEnvoi","DESC"]],
      limit,
      offset:(page-1)*limit,
    });

    res.json({
      success:true,
      data: messages.map(m=>({...m.toJSON(), destinataires:m.destinataires||[], piecesJointes:m.piecesJointes||[], expediteur:m.expediteur||null})),
      pagination:{page, pages:Math.ceil(total/limit), total},
    });
  } catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const getBrouillons = async (req,res)=>{
  try{
    if(!req.user?.id) return res.status(401).json({success:false,message:"Utilisateur non authentifié"});

    const page = parseInt(req.query.page)||1;
    const limit = parseInt(req.query.limit)||20;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where:{ expediteurId:req.user.id, estBrouillon:true, estSupprime:false },
      include:[{ model: User, as:"destinataires", attributes:["id","nom","prenom","email"], through:{attributes:[]} }],
      order:[["dateEnvoi","DESC"]],
      limit,
      offset:(page-1)*limit,
      distinct:true,
    });

    res.json({
      success:true,
      data: messages.map(m=>({...m.toJSON(), destinataires:m.destinataires||[], piecesJointes:m.piecesJointes||[]})),
      pagination:{page, pages:Math.ceil(total/limit), total},
    });
  } catch(error){
    console.error("Erreur getBrouillons:",error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

/* ======================================================
   🔎 DÉTAIL D'UN MESSAGE
   ====================================================== */
const getMessage = async (req,res)=>{
  try{
    if(!req.user?.id) return res.status(401).json({success:false,message:"Utilisateur non authentifié"});

    const message = await Message.findByPk(req.params.id,{
      include:[
        {model:User,as:"expediteur",attributes:["id","nom","prenom","email","photo"]},
        {model:User,as:"destinataires",attributes:["id","nom","prenom","email","photo"], through:{attributes:[]}},
      ]
    });

    if(!message) return res.status(404).json({success:false,message:"Message non trouvé"});

    res.json({success:true,data:{...message.toJSON(), destinataires:message.destinataires||[], piecesJointes:message.piecesJointes||[], expediteur:message.expediteur||null}});
  }catch(error){
    console.error("Erreur getMessage:",error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};
/* ======================================================
   🔎 TOUS LES MESSAGES
   ====================================================== */
const getAllMessages = async (req, res) => {
  try {
    if (!req.user?.id)
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });

    // Récupère tous les messages sans filtrage
    const messages = await Message.findAll({
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
      ],
      order: [["createdAt", "DESC"]],
    });

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
    console.error("Erreur getAllMessagesAdmin:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};


/* ======================================================
   🔗 CONVERSATION / THREAD
   ====================================================== */
const getConversation = async (req,res)=>{
  try{
    if(!req.user?.id) return res.status(401).json({success:false,message:"Utilisateur non authentifié"});

    const threadId = req.params.threadId;

    const mainMessage = await Message.findByPk(threadId,{
      include:[
        {model:User,as:"expediteur",attributes:["id","nom","prenom","email","photo"]},
        {model:User,as:"destinataires",attributes:["id","nom","prenom","email","photo"], through:{attributes:[]}},
      ]
    });
    if(!mainMessage) return res.status(404).json({success:false,message:"Message principal non trouvé"});

    const reponses = await Message.findAll({
      where:{threadId},
      include:[
        {model:User,as:"expediteur",attributes:["id","nom","prenom","email","photo"]},
        {model:User,as:"destinataires",attributes:["id","nom","prenom","email","photo"], through:{attributes:[]}},
      ],
      order:[["dateEnvoi","ASC"]],
    });

    res.json({
      success:true,
      data:{
        mainMessage:mainMessage.toJSON(),
        reponses:reponses.map(r=>r.toJSON()),
        conversation:[mainMessage.toJSON(),...reponses.map(r=>r.toJSON())]
      }
    });
  }catch(error){
    console.error("Erreur getConversation:",error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};


/* ======================================================
   🗂️ GESTION CORBEILLE & FAVORIS & ARCHIVES
   ====================================================== */
/* ======================================================
   🗂️ CORBEILLE / FAVORIS / ARCHIVES / SUPPRESSION
   ====================================================== */
const marquerCommeLu = async (req,res)=>{
  try{
    const message = await Message.findByPk(req.params.id,{include:[{model:User,as:"destinataires"}]});
    if(!message || !message.destinataires.some(d=>d.id===req.user.id)) return res.status(404).json({success:false,message:"Message non trouvé"});

    message.estLu = true;
    await message.save();

    res.json({success:true,message:"Message marqué comme lu"});
  }catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const toggleArchiveMessage = async (req,res)=>{
  try{
    const message = await Message.findByPk(req.params.id);
    if(!message) return res.status(404).json({success:false,message:"Message non trouvé"});

    message.estArchive = !message.estArchive;
    await message.save();
    res.json({success:true,message:message.estArchive?"Message archivé":"Message désarchivé"});
  }catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const toggleFavori = async (req,res)=>{
  try{
    const message = await Message.findByPk(req.params.id);
    if(!message) return res.status(404).json({success:false,message:"Message non trouvé"});

    message.estFavori = !message.estFavori;
    await message.save();

    res.json({success:true,message:message.estFavori?"Message ajouté aux favoris":"Message retiré des favoris"});
  }catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const supprimerMessage = async (req,res)=>{
  try{
    const message = await Message.findByPk(req.params.id);
    if(!message) return res.status(404).json({success:false,message:"Message non trouvé"});

    message.estSupprime = true;
    await message.save();

    res.json({success:true,message:"Message déplacé vers la corbeille"});
  }catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const restaurerMessage = async (req,res)=>{
  try{
    const message = await Message.findByPk(req.params.id);
    if(!message) return res.status(404).json({success:false,message:"Message non trouvé"});

    message.estSupprime = false;
    await message.save();

    res.json({success:true,message:"Message restauré"});
  }catch(error){
    console.error(error);
    res.status(500).json({success:false,message:"Erreur serveur"});
  }
};

const marquerTousLus = async (req, res) => {
  try {
    await Message.update(
      { estLu: true },
      {
        where: { estLu: false, "$destinataires.id$": req.user.id },
        include: [{ model: User, as: "destinataires" }],
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
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
    }

    const count = await Message.count({
      include: [
        {
          model: User,
          as: "destinataires",
          where: { id: req.user.id },
          required: true, // uniquement les messages où l'utilisateur est destinataire
          through: { attributes: [] },
        },
      ],
      where: { estLu: false, estSupprime: false, estArchive: false },
    });

    res.json({ success: true, count });
  } catch (error) {
    console.error("Erreur nombreMessagesNonLus:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

const nombreBrouillons = async (req, res) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
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
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
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
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
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
      return res.status(401).json({ success: false, message: "Utilisateur non authentifié" });
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

// Récupérer les messages favoris
const getFavoris = async (req, res) => {
  try {
    // Vérifie si l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { estFavori: true, estSupprime: false },
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email"],
          through: { attributes: [] }, // Nécessaire pour belongsToMany
        },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true, // important pour count correct
    });

    // Formate les messages pour garantir que les tableaux existent
    const formattedMessages = messages.map((m) => {
      const msg = m.toJSON();
      return {
        ...msg,
        destinataires: msg.destinataires || [],
        piecesJointes: msg.piecesJointes || [],
        expediteur: msg.expediteur || null,
      };
    });

    res.json({
      success: true,
      data: formattedMessages,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.error("Erreur getFavoris:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Récupérer les messages archivés
const getMessagesArchives = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { estArchive: true, estSupprime: false },
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email"],
          through: { attributes: [] },
        },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true, // ✅ très important pour belongsToMany
    });

    const formattedMessages = messages.map((m) => {
      const msg = m.toJSON();
      return {
        ...msg,
        destinataires: msg.destinataires || [],
        piecesJointes: msg.piecesJointes || [],
        expediteur: msg.expediteur || null,
      };
    });

    res.json({
      success: true,
      data: formattedMessages,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.error("Erreur getMessagesArchives:", error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// Récupérer les messages dans la corbeille
const getCorbeille = async (req, res) => {
  try {
    // Vérifie si l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      return res
        .status(401)
        .json({ success: false, message: "Utilisateur non authentifié" });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const { rows: messages, count: total } = await Message.findAndCountAll({
      where: { estSupprime: true },
      include: [
        {
          model: User,
          as: "expediteur",
          attributes: ["id", "nom", "prenom", "email"],
        },
        {
          model: User,
          as: "destinataires",
          attributes: ["id", "nom", "prenom", "email"],
          through: { attributes: [] }, // Nécessaire pour belongsToMany
        },
      ],
      order: [["dateEnvoi", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      distinct: true, // Important pour count correct
    });

    // Formate les messages pour éviter les undefined dans le frontend
    const formattedMessages = messages.map((m) => {
      const msg = m.toJSON();
      return {
        ...msg,
        destinataires: msg.destinataires || [],
        piecesJointes: msg.piecesJointes || [],
        expediteur: msg.expediteur || null,
      };
    });

    res.json({
      success: true,
      data: formattedMessages,
      pagination: { page, pages: Math.ceil(total / limit), total },
    });
  } catch (error) {
    console.error("Erreur getCorbeille:", error);
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

