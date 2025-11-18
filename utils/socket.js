import { Server } from "socket.io";
import User from "../models/User.js";
import Communication from "../models/communication.js";

const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Utilisateur connecté:", socket.id);

    // Rejoindre une conversation (privé ou groupe)
    socket.on("joinConversation", async ({ groupId, recipientId, userId }) => {
      if (!userId) return;
      if (groupId) socket.join("group_" + groupId);
      if (recipientId)
        socket.join("private_" + [userId, recipientId].sort().join("_"));

      if (!onlineUsers.has(userId)) onlineUsers.set(userId, []);
      onlineUsers.get(userId).push(socket.id);

      const usersData = await User.findAll({
        where: { id: Array.from(onlineUsers.keys()) },
        attributes: ["id", "nom", "prenom"],
      });
      io.emit("onlineUsers", usersData);
    });

    // Envoyer un message
    socket.on(
      "sendMessage",
      async ({ content, groupId, recipientId, userId }) => {
        if (!content) return;

        try {
          // Créer le message côté serveur
          const msg = await Communication.create({
            content,
            groupId: groupId || null,
            recipientId: recipientId || null,
            userId,
          });

          const msgWithUser = await Communication.findByPk(msg.id, {
            include: [
              { model: User, attributes: ["id", "nom", "prenom"], as: "user" },
            ],
          });

          // Émettre le message aux bons canaux
          if (groupId)
            io.to("group_" + groupId).emit("receiveMessage", msgWithUser);
          if (recipientId)
            io.to("private_" + [userId, recipientId].sort().join("_")).emit(
              "receiveMessage",
              msgWithUser
            );
        } catch (err) {
          console.error("Erreur envoi message:", err);
        }
      }
    );

    // Déconnexion
    socket.on("disconnect", async () => {
      onlineUsers.forEach((sockets, userId) => {
        onlineUsers.set(
          userId,
          sockets.filter((id) => id !== socket.id)
        );
        if (onlineUsers.get(userId).length === 0) onlineUsers.delete(userId);
      });

      const usersData = await User.findAll({
        where: { id: Array.from(onlineUsers.keys()) },
        attributes: ["id", "nom", "prenom"],
      });
      io.emit("onlineUsers", usersData);
      console.log("Utilisateur déconnecté:", socket.id);
    });
  });

  return io;
};
