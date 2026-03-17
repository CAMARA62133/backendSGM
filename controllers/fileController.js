// ✅ Import centralisé pour éviter les erreurs de relations
import { File, User, Communication } from "../models/index.js";

export const uploadFile = async (req, res) => {
  try {
    const { conversationId, type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Aucun fichier" });
    }

    const fileRecord = await File.create({
      filename: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedBy: req.user.id,
      conversationId,
    });

    const message = await Communication.create({
      content: `📎 Fichier: ${file.originalname}`,
      userId: req.user.id,
      groupId: type === "group" ? parseInt(conversationId) : null,
      recipientId: type === "private" ? parseInt(conversationId) : null,
      fileId: fileRecord.id,
    });

    // ⚠️ ATTENTION : L'alias doit être "author" (si défini ainsi dans index.js)
    const messageWithFile = await Communication.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "author", // ✅ Correspond à Communication.belongsTo(User, { as: "author" })
          attributes: ["id", "nom", "prenom", "photo"],
        },
        { model: File, as: "file" },
      ],
    });

    const room =
      type === "group"
        ? `group_${conversationId}`
        : `private_${[req.user.id, conversationId].sort().join("_")}`;

    req.io.to(room).emit("receiveMessage", messageWithFile);
    res.json({ success: true, data: messageWithFile });
  } catch (error) {
    console.error("Erreur uploadFile:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getConversationFiles = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const files = await File.findAll({
      where: { conversationId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "uploader", // ✅ Correspond à File.belongsTo(User, { as: "uploader" })
          attributes: ["id", "nom", "prenom", "photo"],
        },
      ],
    });

    res.json({ success: true, data: files });
  } catch (error) {
    console.error("Erreur getConversationFiles:", error);
    res.status(500).json({ message: error.message });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const file = await File.findByPk(fileId);

    if (!file) {
      return res.status(404).json({ message: "Fichier non trouvé" });
    }

    res.download(file.path, file.originalname);
  } catch (error) {
    console.error("Erreur downloadFile:", error);
    res.status(500).json({ message: error.message });
  }
};
