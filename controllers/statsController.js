import { Op, fn, col, literal } from "sequelize";
import { Communication, User } from "../models/index.js";

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = "week" } = req.query;

    const now = new Date();
    let dateFilter = {};

    if (period === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      dateFilter = { [Op.gte]: weekAgo };
    } else if (period === "month") {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      dateFilter = { [Op.gte]: monthAgo };
    } else if (period === "year") {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      dateFilter = { [Op.gte]: yearAgo };
    }

    /**
     * 🔥 Condition commune :
     * - messages envoyés par userId
     * - non supprimés
     * - non masqués par l'utilisateur
     */
    const baseWhere = {
      userId,
      isDeleted: false,
      createdAt: dateFilter,
      [Op.and]: [literal(`NOT ("hiddenBy"::jsonb @> '[${userId}]')`)],
    };

    // ===============================
    // 1️⃣ Messages envoyés par jour
    // ===============================
    const messagesByDay = await Communication.findAll({
      where: baseWhere,
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true,
    });

    // ===============================
    // 2️⃣ Top interlocuteurs (optimisé avec include)
    // ===============================
    const topInterlocutors = await Communication.findAll({
      where: {
        ...baseWhere,
        recipientId: { [Op.ne]: null },
      },
      attributes: [
        "recipientId",
        [fn("COUNT", col("Communication.id")), "count"],
      ],
      include: [
        {
          model: User,
          as: "recipient", // ⚠️ doit correspondre à ton alias d'association
          attributes: ["id", "nom", "prenom"],
        },
      ],
      group: [
        "recipientId",
        "recipient.id",
        "recipient.nom",
        "recipient.prenom",
      ],
      order: [[fn("COUNT", col("Communication.id")), "DESC"]],
      limit: 5,
      raw: true,
      nest: true,
    });

    // ===============================
    // 3️⃣ Heures de pointe
    // ===============================
    const peakHours = await Communication.findAll({
      where: baseWhere,
      attributes: [
        [fn("EXTRACT", literal('HOUR FROM "createdAt"')), "hour"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: [fn("EXTRACT", literal('HOUR FROM "createdAt"'))],
      order: [[fn("EXTRACT", literal('HOUR FROM "createdAt"')), "ASC"]],
      raw: true,
    });

    // ===============================
    // 📊 Total messages
    // ===============================
    const totalMessages = messagesByDay.reduce(
      (acc, d) => acc + parseInt(d.count),
      0,
    );

    // ===============================
    // 🎯 Réponse finale
    // ===============================
    res.json({
      success: true,
      data: {
        messagesByDay: messagesByDay.map((d) => ({
          date: d.date,
          count: parseInt(d.count),
        })),

        topInterlocutors: topInterlocutors.map((item) => ({
          interlocutorId: item.recipientId,
          name: item.recipient
            ? `${item.recipient.prenom} ${item.recipient.nom}`
            : "Utilisateur inconnu",
          count: parseInt(item.count),
        })),

        peakHours: peakHours.map((h) => ({
          hour: parseInt(h.hour),
          count: parseInt(h.count),
        })),

        totalMessages,
      },
    });
  } catch (error) {
    console.error("Erreur getUserStats:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors du calcul des statistiques",
    });
  }
};
