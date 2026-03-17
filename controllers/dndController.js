import { DNDSettings } from "../models/index.js";
import { getConversationId } from "../utils/idHelper.js";

export const updateDNDSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    let {
      recipientId = null, // On demande le destinataire au lieu de l'ID de conv direct
      enabled,
      schedule = null,
      keywords = [],
      autoReply = null,
    } = req.body;

    // 1️⃣ Validation
    if (typeof enabled !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "enabled doit être booléen" });
    }

    // 2️⃣ Calcul de l'ID identique au Socket
    // Si recipientId est fourni, on génère le hash, sinon c'est le DND global (null)
    const convId = recipientId ? getConversationId(userId, recipientId) : null;

    // 3️⃣ Normalisation
    keywords = Array.isArray(keywords)
      ? keywords.map((k) => k.toLowerCase().trim()).filter(Boolean)
      : [];
    autoReply = autoReply?.trim() || null;

    // 4️⃣ Create or Update
    const [settings] = await DNDSettings.findOrCreate({
      where: { userId, conversationId: convId },
      defaults: { userId, conversationId: convId, enabled: false },
    });

    await settings.update({ enabled, schedule, keywords, autoReply });

    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Erreur updateDNDSettings:", error);
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

export const getDNDSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { recipientId } = req.params; // Passer recipientId dans l'URL (ou "global")

    const convId =
      recipientId === "global" || !recipientId
        ? null
        : getConversationId(userId, recipientId);

    const settings = await DNDSettings.findOne({
      where: { userId, conversationId: convId },
    });

    return res.json({
      success: true,
      data: settings || {
        enabled: false,
        schedule: null,
        keywords: [],
        autoReply: null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
