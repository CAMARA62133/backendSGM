// ✅ Importation depuis l'index pour garantir que les relations sont chargées
import { ReadReceipt, User } from "../models/index.js";

export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // 1. Créer ou mettre à jour l'accusé de réception
    const [receipt, created] = await ReadReceipt.findOrCreate({
      where: { messageId, userId },
      defaults: { readAt: new Date() },
    });

    if (!created) {
      await receipt.update({ readAt: new Date() });
    }

    // 2. Récupérer tous les accusés pour ce message avec les infos User
    const receipts = await ReadReceipt.findAll({
      where: { messageId },
      include: [
        {
          model: User,
          as: "user", // ✅ Correspond à ReadReceipt.belongsTo(User, { as: "user" })
          attributes: ["id", "nom", "prenom", "photo"],
        },
      ],
      order: [["readAt", "DESC"]],
    });

    // 3. Notifier via socket
    // Astuce : On peut émettre à une "room" de conversation spécifique si tu l'as configurée
    req.io.emit("messageRead", { messageId: Number(messageId), receipts });

    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error("Erreur markAsRead:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMessageReadReceipts = async (req, res) => {
  try {
    const { messageId } = req.params;

    const receipts = await ReadReceipt.findAll({
      where: { messageId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nom", "prenom", "photo"],
        },
      ],
      order: [["readAt", "DESC"]],
    });

    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error("Erreur getMessageReadReceipts:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
