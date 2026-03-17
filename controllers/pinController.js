// ✅ Import centralisé
import { PinnedMessage, Communication, User } from "../models/index.js";

// =====================================================
// 📌 PIN MESSAGE
// =====================================================
export const pinMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const conversationId = String(req.body.conversationId);
    const userId = Number(req.user?.id);

    if (!messageId || !conversationId) {
      return res
        .status(400)
        .json({ success: false, message: "Paramètres manquants" });
    }

    const message = await Communication.findByPk(messageId);

    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message non trouvé" });
    }

    // --- VÉRIFICATION DE COHÉRENCE AMÉLIORÉE ---
    const expectedGroupId = `group-${message.groupId}`;
    const expectedDmId = `user-${message.userId}`;
    const expectedRecipientId = `user-${message.recipientId}`;

    const isMatch =
      (message.groupId && conversationId === expectedGroupId) ||
      (message.recipientId &&
        (conversationId === expectedDmId ||
          conversationId === expectedRecipientId)) ||
      message.conversationId === conversationId; // Backup pour compatibilité string directe

    if (!isMatch) {
      return res.status(403).json({
        success: false,
        message: "Le message n'appartient pas à cette conversation",
      });
    }

    // Vérifier si déjà épinglé
    const existingPin = await PinnedMessage.findOne({
      where: { messageId, conversationId },
    });
    if (existingPin)
      return res.status(400).json({ success: false, message: "Déjà épinglé" });

    // Limite de 10
    const pinCount = await PinnedMessage.count({ where: { conversationId } });
    if (pinCount >= 10)
      return res
        .status(400)
        .json({ success: false, message: "Maximum 10 messages épinglés" });

    const pinned = await PinnedMessage.create({
      messageId,
      conversationId,
      pinnedBy: userId,
      pinnedAt: new Date(),
    });

    const pinnedWithDetails = await PinnedMessage.findByPk(pinned.id, {
      include: [
        {
          model: Communication,
          as: "message",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "nom", "prenom", "photo"],
            },
          ],
        },
        {
          model: User,
          as: "pinner",
          attributes: ["id", "nom", "prenom", "photo"],
        },
      ],
    });

    if (req.io)
      req.io.to(conversationId).emit("messagePinned", pinnedWithDetails);

    return res.status(201).json({ success: true, data: pinnedWithDetails });
  } catch (error) {
    console.error("❌ Erreur pinMessage:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

// =====================================================
// ❌ UNPIN MESSAGE (CORRIGÉ)
// =====================================================
export const unpinMessage = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    // On s'assure que c'est une string pour la comparaison
    const conversationId = req.body.conversationId
      ? String(req.body.conversationId)
      : null;

    if (!messageId || !conversationId) {
      return res
        .status(400)
        .json({ success: false, message: "Paramètres manquants" });
    }

    // 1️⃣ Chercher le pin existant pour être sûr de ce qu'on supprime
    // On utilise Op.or pour être flexible sur le format de l'ID stocké
    const pin = await PinnedMessage.findOne({
      where: {
        messageId,
        conversationId: conversationId,
      },
    });

    if (!pin) {

      return res
        .status(404)
        .json({
          success: false,
          message: "Message non trouvé dans les épingles",
        });
    }

    await pin.destroy();

    if (req.io) {
      req.io.to(conversationId).emit("messageUnpinned", { messageId });
    }

    

    return res.json({
      success: true,
      message: "Message désépinglé avec succès",
      data: { messageId, conversationId },
    });
  } catch (error) {
    console.error("❌ Erreur unpinMessage:", error);
    return res
      .status(500)
      .json({ success: false, message: "Erreur serveur lors du désépinglage" });
  }
};

// =====================================================
// 📌 GET PINNED MESSAGES (CORRIGÉ)
// =====================================================
export const getPinnedMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res
        .status(400)
        .json({ success: false, message: "conversationId requis" });
    }

    const pinnedMessages = await PinnedMessage.findAll({
      where: {
        conversationId: String(conversationId),
      },
      include: [
        {
          model: Communication,
          as: "message",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "nom", "prenom", "photo"],
            },
          ],
        },
        {
          model: User,
          as: "pinner",
          attributes: ["id", "nom", "prenom", "photo"],
        },
      ],
      order: [["pinnedAt", "DESC"]], // Les plus récents en premier
    });

    // Optionnel : Filtrer les messages qui auraient pu être supprimés entre-temps
    // si ton modèle Communication utilise le soft delete (isDeleted)
    const activePins = pinnedMessages.filter(
      (pin) => pin.message && !pin.message.isDeleted,
    );

    return res.json({
      success: true,
      count: activePins.length,
      data: activePins,
    });
  } catch (error) {
    console.error("❌ Erreur getPinnedMessages:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
