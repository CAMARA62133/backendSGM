import { Op } from "sequelize";
import { Communication, User, Group } from "../models/index.js";

export const globalSearch = async (req, res) => {
  try {
    const { q, type, from, to, conversationId } = req.query;
    const userId = Number(req.user.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        message: "Minimum 2 caractères requis",
      });
    }

    let whereClause = {
      content: { [Op.iLike]: `%${q}%` },
      isDeleted: false, // exclure les messages supprimés
    };

    if (type === "private") whereClause.groupId = null;
    else if (type === "group") whereClause.groupId = { [Op.ne]: null };

    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt[Op.gte] = new Date(from);
      if (to) whereClause.createdAt[Op.lte] = new Date(to);
    }

    if (conversationId) {
      if (conversationId.startsWith("user-")) {
        const otherUserId = parseInt(conversationId.split("-")[1]);
        whereClause = {
          ...whereClause,
          [Op.or]: [
            { userId: userId, recipientId: otherUserId },
            { userId: otherUserId, recipientId: userId },
          ],
        };
      } else if (conversationId.startsWith("group-")) {
        const groupId = parseInt(conversationId.split("-")[1]);
        whereClause.groupId = groupId;
      }
    }

    const { count, rows } = await Communication.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "prenom", "photo"],
        },
        {
          model: User,
          as: "recipient",
          attributes: ["id", "nom", "prenom", "photo"],
        },
        {
          model: Group,
          as: "group",
          attributes: ["id", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // ✅ Filtrer côté serveur les messages cachés pour moi
    const visibleMessages = rows.filter(
      (msg) => !msg.hiddenBy || !msg.hiddenBy.includes(userId),
    );

    res.json({
      success: true,
      data: visibleMessages,
      total: visibleMessages.length,
      page,
      totalPages: Math.ceil(visibleMessages.length / limit),
    });
  } catch (error) {
    console.error("Erreur globalSearch:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
