// -------------------------
// IMPORTS
// -------------------------
import Communication from "../models/communication.js";
import User from "../models/User.js";
import Group, { GroupUser } from "../models/group.js";
import { Op } from "sequelize";
import { sendEmail } from "../utils/email.js";

// -------------------------
// UTILITAIRE : COUNT MESSAGES NON LUS
// -------------------------
const getUnreadCommunicationCount = async (userId) => {
  const memberships = await GroupUser.findAll({
    where: { UserId: userId },
    attributes: ["GroupId"],
  });

  const groupIds = memberships.map((m) => m.GroupId);

  return await Communication.count({
    where: {
      isRead: false,
      userId: { [Op.ne]: userId },
      [Op.or]: [
        { recipientId: userId },
        { groupId: { [Op.in]: groupIds.length ? groupIds : [0] } },
      ],
    },
  });
};

// -------------------------
// 1. GET USER GROUPS
// -------------------------
export const getUserGroups = async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);

    const memberships = await GroupUser.findAll({
      where: { UserId: currentUserId },
      attributes: ["GroupId"],
    });

    const groupIds = memberships.map((m) => m.GroupId);
    if (!groupIds.length) return res.json({ data: [] });

    const groups = await Group.findAll({
      where: { id: { [Op.in]: groupIds } },
      include: [
        {
          model: User,
          attributes: ["id", "nom", "prenom"],
          through: { attributes: ["role"] },
        },
        { model: User, as: "creator", attributes: ["id", "nom", "prenom"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({ data: groups });
  } catch (err) {
    console.error("❌ getUserGroups:", err);
    res.status(500).json({ message: "Erreur récupération groupes" });
  }
};

// -------------------------
// 2. CREATE GROUP
// -------------------------
export const createGroup = async (req, res) => {
  try {
    const io = req.io;
    const onlineUsers = req.onlineUsers;

    const { name, userIds } = req.body;
    if (!name || !userIds?.length)
      return res.status(400).json({ message: "Nom et utilisateurs requis" });

    // Créer le groupe
    const group = await Group.create({
      name,
      isPrivate: true,
      creatorId: req.user.id,
    });

    // Ajouter le créateur + membres
    const members = [
      { GroupId: group.id, UserId: req.user.id, role: "owner" },
      ...userIds
        .map(Number)
        .filter((id) => id !== Number(req.user.id))
        .map((id) => ({ GroupId: group.id, UserId: id, role: "member" })),
    ];

    await GroupUser.bulkCreate(members);

    // Envoyer notifications et emails
    for (const id of members.map((m) => m.UserId)) {
      if (id === Number(req.user.id)) continue;
      const user = await User.findByPk(id);

      if (onlineUsers.has(user.id)) {
        onlineUsers.get(user.id).forEach((socketId) => {
          io.to(socketId).emit("addedToGroup", {
            groupId: group.id,
            name: group.name,
            creator: {
              id: req.user.id,
              prenom: req.user.prenom,
              nom: req.user.nom,
            },
          });
        });
      } else {
        sendEmail(
          user.email,
          `Nouveau groupe : ${group.name}`,
          `Bonjour ${user.prenom}, ${req.user.prenom} vous a ajouté au groupe "${group.name}".`,
        );
      }
    }

    // Retourner groupe complet
    const groupWithUsers = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          attributes: ["id", "nom", "prenom"],
          through: { attributes: ["role"] },
        },
        { model: User, as: "creator", attributes: ["id", "nom", "prenom"] },
      ],
    });

    res.status(201).json({ data: groupWithUsers });
  } catch (err) {
    console.error("❌ createGroup:", err);
    res.status(500).json({ message: "Erreur création groupe" });
  }
};

// -------------------------
// 3. UPDATE GROUP
// -------------------------
export const updateGroup = async (req, res) => {
  try {
    const io = req.io;
    const onlineUsers = req.onlineUsers;

    const { groupId } = req.params;
    const { name, userIds } = req.body;

    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: "Groupe non trouvé" });
    if (Number(group.creatorId) !== Number(req.user.id))
      return res.status(403).json({ message: "Non autorisé" });

    // Mettre à jour le nom
    if (name) {
      group.name = name;
      await group.save();
    }

    if (userIds?.length) {
      // IDs uniques + inclure créateur
      const newIds = [...new Set(userIds.map(Number))];
      if (!newIds.includes(Number(group.creatorId)))
        newIds.push(Number(group.creatorId));

      // Membres actuels
      const oldMembers = await GroupUser.findAll({
        where: { GroupId: groupId },
      });
      const oldIds = oldMembers.map((m) => Number(m.UserId));

      // Ajouter / retirer
      const added = newIds.filter((id) => !oldIds.includes(id));
      const removed = oldIds.filter((id) => !newIds.includes(id));

      // Supprimer anciens, ajouter nouveaux
      await GroupUser.destroy({ where: { GroupId: groupId } });
      await GroupUser.bulkCreate(
        newIds.map((id) => ({
          GroupId: groupId,
          UserId: id,
          role: id === Number(group.creatorId) ? "owner" : "member",
        })),
      );

      // Notifications + emails
      for (const id of added) {
        if (id === Number(req.user.id)) continue;
        const user = await User.findByPk(id);

        if (onlineUsers.has(user.id)) {
          onlineUsers.get(user.id).forEach((socketId) => {
            io.to(socketId).emit("addedToGroup", {
              groupId,
              name: group.name,
              creator: {
                id: req.user.id,
                prenom: req.user.prenom,
                nom: req.user.nom,
              },
            });
          });
        } else {
          sendEmail(
            user.email,
            `Ajout au groupe : ${group.name}`,
            `Bonjour ${user.prenom}, ${req.user.prenom} vous a ajouté au groupe "${group.name}".`,
          );
        }
      }

      for (const id of removed) {
        if (id === Number(req.user.id)) continue;
        const user = await User.findByPk(id);

        if (onlineUsers.has(user.id)) {
          onlineUsers.get(user.id).forEach((socketId) => {
            io.to(socketId).emit("removedFromGroup", {
              groupId,
              name: group.name,
            });
          });
        } else {
          sendEmail(
            user.email,
            `Retrait du groupe : ${group.name}`,
            `Bonjour ${user.prenom}, vous ne faites plus partie du groupe "${group.name}".`,
          );
        }
      }
    }

    // Retourner groupe complet avec membres
    const updatedGroup = await Group.findByPk(groupId, {
      include: [
        {
          model: User,
          attributes: ["id", "nom", "prenom"],
          through: { attributes: ["role"] },
        },
        { model: User, as: "creator", attributes: ["id", "nom", "prenom"] },
      ],
    });

    res.json({ data: updatedGroup });
  } catch (err) {
    console.error("❌ updateGroup:", err);
    res.status(500).json({ message: "Erreur mise à jour" });
  }
};

// -------------------------
// 4. DELETE GROUP
// -------------------------
export const deleteGroup = async (req, res) => {
  try {
    const io = req.io;
    const onlineUsers = req.onlineUsers;

    const { groupId } = req.params;
    const group = await Group.findByPk(groupId);
    if (!group) return res.status(404).json({ message: "Groupe non trouvé" });
    if (Number(group.creatorId) !== Number(req.user.id))
      return res.status(403).json({ message: "Non autorisé" });

    const members = await GroupUser.findAll({ where: { GroupId: groupId } });

    for (const member of members) {
      if (member.UserId === Number(req.user.id)) continue;
      const user = await User.findByPk(member.UserId);

      if (onlineUsers.has(user.id)) {
        onlineUsers.get(user.id).forEach((socketId) => {
          io.to(socketId).emit("groupDeleted", { groupId, name: group.name });
        });
      } else {
        sendEmail(
          user.email,
          `Suppression du groupe : ${group.name}`,
          `Bonjour ${user.prenom}, le groupe "${group.name}" a été supprimé par ${req.user.prenom}.`,
        );
      }
    }

    await group.destroy();
    res.json({ message: "Groupe supprimé" });
  } catch (err) {
    console.error("❌ deleteGroup:", err);
    res.status(500).json({ message: "Erreur suppression" });
  }
};

// -------------------------
// 5. SEND MESSAGE
// -------------------------
export const sendCommunication = async (req, res) => {
  try {
    const io = req.io;
    const onlineUsers = req.onlineUsers;

    const { content, groupId, recipientId } = req.body;
    const currentUserId = Number(req.user.id);

    if (!content?.trim())
      return res.status(400).json({ message: "Message vide" });

    const message = await Communication.create({
      content,
      groupId: groupId || null,
      recipientId: recipientId || null,
      userId: currentUserId,
      isRead: false,
    });

    const msgWithUser = await Communication.findByPk(message.id, {
      include: [
        { model: User, as: "user", attributes: ["id", "nom", "prenom"] },
      ],
    });

    // Notifications privés
    if (recipientId && recipientId !== currentUserId) {
      const user = await User.findByPk(recipientId);
      if (onlineUsers.has(user.id)) {
        onlineUsers
          .get(user.id)
          .forEach((socketId) =>
            io.to(socketId).emit("receiveMessage", msgWithUser),
          );
      } else {
        sendEmail(
          user.email,
          `Nouveau message de ${req.user.prenom}`,
          `Vous avez reçu : "${content}"`,
        );
      }
    }

    // Notifications groupe
    if (groupId) {
      const members = await GroupUser.findAll({ where: { GroupId: groupId } });
      for (const member of members) {
        if (member.UserId === currentUserId) continue;
        if (onlineUsers.has(member.UserId)) {
          onlineUsers
            .get(member.UserId)
            .forEach((socketId) =>
              io.to(socketId).emit("receiveMessage", msgWithUser),
            );
        }
      }
    }

    res.status(201).json({ data: msgWithUser });
  } catch (err) {
    console.error("❌ sendCommunication:", err);
    res.status(500).json({ message: "Erreur envoi message" });
  }
};

// -------------------------
// 6. GET MESSAGES
// -------------------------
export const getCommunication = async (req, res) => {
  try {
    const { groupId, recipientId } = req.query;
    const currentUserId = Number(req.user.id);
    let where = {};

    if (groupId) {
      where.groupId = groupId;
      await Communication.update(
        { isRead: true },
        {
          where: { groupId, userId: { [Op.ne]: currentUserId }, isRead: false },
        },
      );
    }

    if (recipientId) {
      where = {
        [Op.or]: [
          { userId: currentUserId, recipientId },
          { userId: recipientId, recipientId: currentUserId },
        ],
      };
      await Communication.update(
        { isRead: true },
        {
          where: {
            userId: recipientId,
            recipientId: currentUserId,
            isRead: false,
          },
        },
      );
    }

    const messages = await Communication.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "nom", "prenom"] },
      ],
      order: [["createdAt", "ASC"]],
    });

    res.json({ data: messages });
  } catch (err) {
    console.error("❌ getCommunication:", err);
    res.status(500).json({ message: "Erreur messages" });
  }
};

// -------------------------
// 7. COUNT UNREAD
// -------------------------
export const nombreCommunicationNonLus = async (req, res) => {
  try {
    const count = await getUnreadCommunicationCount(req.user.id);
    res.json({ success: true, count });
  } catch (err) {
    console.error("❌ nombreCommunicationNonLus:", err);
    res.status(500).json({ success: false });
  }
};

// -------------------------
// 8. GET UNREAD BY CONVERSATION
// -------------------------
export const getUnreadByConversation = async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);

    const memberships = await GroupUser.findAll({
      where: { UserId: currentUserId },
      attributes: ["GroupId"],
    });
    const groupIds = memberships.map((m) => m.GroupId);

    const messages = await Communication.findAll({
      where: {
        isRead: false,
        userId: { [Op.ne]: currentUserId },
        [Op.or]: [
          { recipientId: currentUserId },
          { groupId: { [Op.in]: groupIds.length ? groupIds : [0] } },
        ],
      },
    });

    const result = {};
    messages.forEach((msg) => {
      if (msg.groupId)
        result[`group-${msg.groupId}`] =
          (result[`group-${msg.groupId}`] || 0) + 1;
      else if (msg.recipientId === currentUserId)
        result[`user-${msg.userId}`] = (result[`user-${msg.userId}`] || 0) + 1;
    });

    res.json({ data: result });
  } catch (err) {
    console.error("❌ getUnreadByConversation:", err);
    res.status(500).json({ message: "Erreur unread" });
  }
};
