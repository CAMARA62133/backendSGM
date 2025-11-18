import Communication from "../models/communication.js";
import User from "../models/User.js";
import Group from "../models/group.js";
import { Op } from "sequelize";

// 📥 Historique messages (privé ou groupe)
export const getCommunication = async (req, res) => {
  try {
    const { groupId, recipientId } = req.query;

    let where = {};
    if (groupId) where.groupId = groupId;
    if (recipientId)
      where = {
        [Op.or]: [
          { userId: req.user.id, recipientId },
          { userId: recipientId, recipientId: req.user.id },
        ],
      };

    const messages = await Communication.findAll({
      where,
      include: [
        { model: User, attributes: ["id", "nom", "prenom"], as: "user" },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.status(200).json({ data: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur récupération messages" });
  }
};

// 📤 Création message
export const sendCommunication = async (req, res) => {
  try {
    const { content, groupId, recipientId } = req.body;
    if (!content) return res.status(400).json({ message: "Content requis" });

    const msg = await Communication.create({
      content,
      groupId: groupId || null,
      recipientId: recipientId || null,
      userId: req.user.id,
    });

    const msgWithUser = await Communication.findByPk(msg.id, {
      include: [
        { model: User, attributes: ["id", "nom", "prenom"], as: "user" },
      ],
    });

    res.status(201).json({ data: msgWithUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur création message" });
  }
};

// 📤 Création groupe
// 📤 Création groupe
export const createGroup = async (req, res) => {
  try {
    const { name, userIds } = req.body;
    if (!name || !userIds?.length)
      return res.status(400).json({ message: "Nom et utilisateurs requis" });

    // Création du groupe avec le créateur
    const group = await Group.create({
      name,
      isPrivate: true,
      creatorId: req.user.id,
    });

    // Ajouter les membres sélectionnés
    const users = await User.findAll({ where: { id: userIds } });
    await group.addUsers(users);

    // Ajouter également le créateur comme membre
    await group.addUser(req.user.id);

    // Retourner le groupe avec tous les utilisateurs
    const groupWithUsers = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          through: { attributes: [] }, // ignore la table intermédiaire
          attributes: ["id", "nom", "prenom"],
        },
      ],
    });

    res.status(201).json({ data: groupWithUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur création groupe" });
  }
};

// 📥 Récupérer tous les groupes de l'utilisateur
// 📥 Récupérer tous les groupes accessibles pour l'utilisateur
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer les groupes dont l'utilisateur est membre
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Group,
          through: { attributes: [] }, // ignore la table intermédiaire
          attributes: ["id", "name", "isPrivate", "creatorId", "createdAt"],
        },
      ],
    });

    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    // Ajouter les groupes créés par l'utilisateur mais dont il n'est pas encore membre
    const createdGroups = await Group.findAll({
      where: { creatorId: userId },
      include: [
        {
          model: User,
          through: { attributes: [] },
          attributes: ["id", "nom", "prenom"],
        },
      ],
    });

    // Fusionner les deux listes en évitant les doublons
    const allGroups = [...user.Groups];
    createdGroups.forEach((g) => {
      if (!allGroups.find((grp) => grp.id === g.id)) allGroups.push(g);
    });

    res.status(200).json({ data: allGroups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur récupération groupes" });
  }
};



// ❌ Supprimer un groupe
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: "Groupe non trouvé" });

    await group.destroy();
    res.status(200).json({ message: "Groupe supprimé" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur suppression groupe" });
  }
};
