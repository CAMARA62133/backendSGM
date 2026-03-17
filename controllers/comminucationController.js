import { Op } from "sequelize";
// ✅ Import centralisé pour garantir que toutes les relations sont chargées
import {
  Communication,
  User,
  Group,
  GroupUser,
  File,
  Poll,
  PollOption,
} from "../models/index.js";
import { sendEmail } from "../utils/email.js";

// -------------------------
// UTILITAIRE : COUNT MESSAGES NON LUS
// -------------------------
const getUnreadCommunicationCount = async (userId) => {
  const memberships = await GroupUser.findAll({
    where: { userId },
    attributes: ["groupId"],
  });

  const groupIds = memberships.map((m) => m.groupId);

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
      where: { userId: currentUserId },
      attributes: ["groupId"],
    });

    const groupIds = memberships.map((m) => m.groupId);
    if (!groupIds.length) return res.json({ data: [] });

    const groups = await Group.findAll({
      where: { id: { [Op.in]: groupIds } },
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "nom", "prenom", "photo"],
          through: { attributes: ["role"] },
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "nom", "prenom", "photo"],
        },
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
    const { name, userIds } = req.body;
    if (!name || !userIds?.length)
      return res.status(400).json({ message: "Nom et utilisateurs requis" });

    const group = await Group.create({
      name,
      isPrivate: true,
      creatorId: Number(req.user.id),
    });

    const members = [
      { groupId: group.id, userId: Number(req.user.id), role: "owner" },
      ...userIds
        .map(Number)
        .filter((id) => id !== Number(req.user.id))
        .map((id) => ({ groupId: group.id, userId: id, role: "member" })),
    ];

    await GroupUser.bulkCreate(members);

    // Notifications aux membres
    members.forEach(async (m) => {
      if (m.userId === Number(req.user.id)) return;

      const user = await User.findByPk(m.userId);
      if (!user) return;

      if (req.onlineUsers?.has(user.id)) {
        req.onlineUsers.get(user.id).forEach((socketId) => {
          req.io.to(socketId).emit("addedToGroup", {
            groupId: group.id,
            name: group.name,
            creator: {
              id: Number(req.user.id),
              prenom: req.user.prenom,
              nom: req.user.nom,
            },
          });
        });
      } else {
        sendEmail(
          user.email,
          `Nouveau groupe : ${group.name}`,
          `Bonjour ${user.prenom}, vous avez été ajouté au groupe "${group.name}".`,
        );
      }
    });

    const groupWithUsers = await Group.findByPk(group.id, {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "nom", "prenom", "photo"],
          through: { attributes: ["role"] },
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "nom", "prenom", "photo"],
        },
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
    const { groupId } = req.params;
    const { name, userIds } = req.body;

    const group = await Group.findByPk(Number(groupId));
    if (!group) return res.status(404).json({ message: "Groupe non trouvé" });
    if (Number(group.creatorId) !== Number(req.user.id))
      return res.status(403).json({ message: "Non autorisé" });

    if (name) {
      group.name = name;
      await group.save();
    }

    if (userIds?.length) {
      const newIds = [...new Set(userIds.map(Number))];
      if (!newIds.includes(Number(group.creatorId)))
        newIds.push(Number(group.creatorId));

      await GroupUser.destroy({ where: { groupId: Number(groupId) } });
      await GroupUser.bulkCreate(
        newIds.map((id) => ({
          groupId: Number(groupId),
          userId: id,
          role: id === Number(group.creatorId) ? "owner" : "member",
        })),
      );

      // Notifications aux nouveaux membres
      const added = newIds.filter((id) => id !== Number(group.creatorId));
      added.forEach(async (id) => {
        const u = await User.findByPk(id);
        if (u && req.onlineUsers?.has(id)) {
          req.onlineUsers.get(id).forEach((socketId) => {
            req.io.to(socketId).emit("addedToGroup", {
              groupId: Number(groupId),
              name: group.name,
            });
          });
        }
      });
    }

    const updatedGroup = await Group.findByPk(Number(groupId), {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "nom", "prenom", "photo"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "nom", "prenom", "photo"],
        },
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
    const { groupId } = req.params;
    const group = await Group.findByPk(Number(groupId));
    if (!group) return res.status(404).json({ message: "Groupe non trouvé" });
    if (Number(group.creatorId) !== Number(req.user.id))
      return res.status(403).json({ message: "Non autorisé" });

    const members = await GroupUser.findAll({
      where: { groupId: Number(groupId) },
    });
    members.forEach((m) => {
      if (req.onlineUsers?.has(m.userId)) {
        req.onlineUsers.get(m.userId).forEach((socketId) => {
          req.io.to(socketId).emit("groupDeleted", {
            groupId: Number(groupId),
            name: group.name,
          });
        });
      }
    });

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
    const { content, groupId, recipientId } = req.body;
    const userId = Number(req.user.id);

    if (!content?.trim())
      return res.status(400).json({ message: "Message vide" });

    let conversationId;
    if (groupId) {
      conversationId = `group-${groupId}`;
    } else if (recipientId) {
      // Pour les DMs, on utilise un ID de conversation unique pour les deux utilisateurs
      // Format: dm-minID-maxID (ex: dm-2-3)
      const [a, b] = [userId, Number(recipientId)].sort((x, y) => x - y);
      conversationId = `dm-${a}-${b}`;
    } else {
      return res.status(400).json({ message: "Cible manquante" });
    }

    const message = await Communication.create({
      content,
      groupId: groupId ? Number(groupId) : null,
      recipientId: recipientId ? Number(recipientId) : null,
      userId,
      conversationId, // Stocké proprement
      isRead: false,
    });

    const msgWithUser = await Communication.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "prenom", "photo"],
        },
        { model: File, as: "file" },
        {
          model: Poll,
          as: "poll",
          include: [{ model: PollOption, as: "options" }],
        },
      ],
    });

    // Socket : on émet sur le canal spécifique
    if (groupId) {
      req.io.to(`group_${groupId}`).emit("receiveMessage", msgWithUser);
    } else {
      const room = `private_${[userId, Number(recipientId)].sort().join("_")}`;
      req.io.to(room).emit("receiveMessage", msgWithUser);
    }

    res.status(201).json({ data: msgWithUser });
  } catch (err) {
    console.error("❌ sendCommunication:", err);
    res.status(500).json({ message: "Erreur envoi" });
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
      where.groupId = Number(groupId);
      await Communication.update(
        { isRead: true },
        {
          where: {
            groupId: Number(groupId),
            userId: { [Op.ne]: currentUserId },
            isRead: false,
          },
        },
      );
    } else if (recipientId) {
      where = {
        [Op.or]: [
          { userId: currentUserId, recipientId: Number(recipientId) },
          { userId: Number(recipientId), recipientId: currentUserId },
        ],
      };
      await Communication.update(
        { isRead: true },
        {
          where: {
            userId: Number(recipientId),
            recipientId: currentUserId,
            isRead: false,
          },
        },
      );
    }

    const messages = await Communication.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "prenom", "photo"],
        },
        { model: File, as: "file" },
        {
          model: Poll,
          as: "poll",
          include: [{ model: PollOption, as: "options" }],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    const visibleMessages = messages.filter(
      (msg) =>
        !msg.isDeleted &&
        (!msg.hiddenBy || !msg.hiddenBy.includes(currentUserId)),
    );

    res.json({ data: visibleMessages });
  } catch (err) {
    console.error("❌ getCommunication:", err);
    res.status(500).json({ message: "Erreur récupération messages" });
  }
};

// -------------------------
// 7. UPDATE / DELETE SINGLE MESSAGE
// -------------------------
export const nombreCommunicationNonLus = async (req, res) => {
  try {
    const count = await getUnreadCommunicationCount(Number(req.user.id));
    res.json({ success: true, count });
  } catch (err) {
    console.error("❌ nombreCommunicationNonLus:", err);
    res.status(500).json({ success: false });
  }
};

export const updateCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const message = await Communication.findByPk(Number(id));
    if (!message)
      return res.status(404).json({ message: "Message introuvable" });

    if (Number(message.userId) !== Number(req.user.id))
      return res.status(403).json({ message: "Non autorisé" });

    message.content = content;
    message.isEdited = true;
    await message.save();

    req.io.emit("messageUpdated", { id: message.id, content: message.content });
    res.json({ success: true, data: message });
  } catch (err) {
    console.error("❌ updateCommunication:", err);
    res.status(500).json({ message: "Erreur modification" });
  }
};

export const deleteCommunication = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = Number(req.user.id);
    const message = await Communication.findByPk(Number(id));

    if (!message) return res.status(404).json({ message: "Non trouvé" });

    if (Number(message.userId) === currentUserId) {
      message.isDeleted = true;
      await message.save();
      req.io.emit("messageDeleted", { messageId: message.id, forAll: true });
    } else {
      const hidden = message.hiddenBy || [];
      if (!hidden.includes(currentUserId)) {
        message.hiddenBy = [...hidden, currentUserId];
        await message.save();
      }
      req.io.to(currentUserId.toString()).emit("messageDeleted", {
        messageId: message.id,
        forAll: false,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteCommunication:", err);
    res.status(500).json({ message: "Erreur suppression" });
  }
};

// -------------------------
// 8. GET UNREAD BY CONVERSATION
// -------------------------
export const getUnreadByConversation = async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const memberships = await GroupUser.findAll({
      where: { userId: currentUserId },
      attributes: ["groupId"],
    });

    const groupIds = memberships.map((m) => m.groupId);

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
      const key = msg.groupId ? `group-${msg.groupId}` : `user-${msg.userId}`;
      result[key] = (result[key] || 0) + 1;
    });

    res.json({ data: result });
  } catch (err) {
    console.error("❌ getUnreadByConversation:", err);
    res.status(500).json({ message: "Erreur unread count" });
  }
};

// -------------------------
// 9. GET COLLEAGUES
// -------------------------
export const getMesCollegues = async (req, res) => {
  try {
    const users = await User.findAll({
      where: { entreprise: req.user.entreprise, id: { [Op.ne]: req.user.id } },
      attributes: [
        "id",
        "nom",
        "prenom",
        "email",
        "photo",
        "secteur_activite",
        "entreprise",
      ],
      order: [["nom", "ASC"]],
    });
    res.json({ users });
  } catch (err) {
    console.error("❌ getMesCollegues:", err);
    res.status(500).json({ success: false });
  }
};
