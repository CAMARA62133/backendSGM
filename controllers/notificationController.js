import Notification from "../models/Notification.js";

/**
 * ==============================
 * Récupérer toutes les notifications d’un utilisateur
 * ==============================
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id; // Sequelize utilise "id"

    const notifications = await Notification.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération des notifications",
      error,
    });
  }
};

/**
 * ==============================
 * Marquer une notification comme lue
 * ==============================
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const notif = await Notification.findByPk(id);
    if (!notif)
      return res.status(404).json({ message: "Notification introuvable" });

    if (notif.userId !== req.user.id)
      return res.status(403).json({ message: "Accès non autorisé" });

    notif.lu = true;
    await notif.save();

    res.status(200).json(notif);
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour de la notification",
      error,
    });
  }
};

/**
 * ==============================
 * Marquer toutes les notifications comme lues
 * ==============================
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const [count] = await Notification.update(
      { lu: true },
      { where: { userId, lu: false } }
    );

    res.status(200).json({
      message: `${count} notifications marquées comme lues`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour des notifications",
      error,
    });
  }
};

/**
 * ==============================
 * Supprimer une notification
 * ==============================
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ message: "ID invalide" });

    const notif = await Notification.findByPk(id);
    if (!notif)
      return res.status(404).json({ message: "Notification introuvable" });

    if (notif.userId !== req.user.id)
      return res.status(403).json({ message: "Accès non autorisé" });

    await notif.destroy();

    res.status(200).json({ message: "Notification supprimée avec succès" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de la notification",
      error,
    });
  }
};
