import Notification from "../models/Notification.js";
import mongoose from "mongoose";

/**
 * ==============================
 * Récupérer toutes les notifications d’un utilisateur
 * ==============================
 * Cette fonction récupère toutes les notifications pour l’utilisateur connecté.
 * - Les notifications sont triées par date de création décroissante (les plus récentes en premier).
 * - Route : GET /api/notifications
 * - Accès : Privé (req.user doit être défini par le middleware d’authentification)
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id; // Récupération de l'ID de l'utilisateur connecté

    // Récupération de toutes les notifications pour l'utilisateur
    const notifications = await Notification.find({ user: userId }).sort({
      createdAt: -1, // Tri décroissant par date de création
    });

    // Retour des notifications
    res.status(200).json(notifications);
  } catch (error) {
    // Gestion des erreurs
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
 * Cette fonction permet de mettre à jour une notification spécifique en la marquant comme lue.
 * - Elle vérifie que l’ID fourni est valide.
 * - Elle s’assure que la notification existe et que l’utilisateur est bien le destinataire.
 * - Route : PUT /api/notifications/:id/mark-as-read
 * - Accès : Privé
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérification de la validité de l'ID
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "ID invalide" });

    // Récupération de la notification
    const notif = await Notification.findById(id);
    if (!notif)
      return res.status(404).json({ message: "Notification introuvable" });

    // Vérification que l'utilisateur est bien le destinataire
    if (notif.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    // Marquage de la notification comme lue
    notif.lu = true;
    await notif.save();

    // Retour de la notification mise à jour
    res.status(200).json(notif);
  } catch (error) {
    // Gestion des erreurs
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
 * Cette fonction met à jour toutes les notifications non lues pour l’utilisateur connecté.
 * - Route : PUT /api/notifications/mark-all-as-read
 * - Accès : Privé
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    // Mise à jour de toutes les notifications non lues
    const result = await Notification.updateMany(
      { user: userId, lu: false },
      { $set: { lu: true } }
    );

    // Retour du nombre de notifications mises à jour
    res.status(200).json({
      message: `${result.modifiedCount} notifications marquées comme lues`,
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
 * Cette fonction supprime une notification spécifique.
 * - Vérifie la validité de l’ID et que l’utilisateur est bien le destinataire.
 * - Route : DELETE /api/notifications/:id
 * - Accès : Privé
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérification de l'ID
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "ID invalide" });

    // Récupération de la notification
    const notif = await Notification.findById(id);
    if (!notif)
      return res.status(404).json({ message: "Notification introuvable" });

    // Vérification que l'utilisateur est bien le destinataire
    if (notif.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Accès non autorisé" });

    // Suppression de la notification
    await notif.deleteOne();

    res.status(200).json({ message: "Notification supprimée avec succès" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de la notification",
      error,
    });
  }
};
