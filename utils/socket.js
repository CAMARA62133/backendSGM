// utils/socket.js
import { Server } from "socket.io";
import User from "../models/User.js";
import Communication from "../models/communication.js";
import { GroupUser } from "../models/group.js";

export const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Utilisateur connecté:", socket.id);

    // ================= JOIN =================
    socket.on("joinConversation", async ({ userId, groupId, recipientId }) => {
      if (!userId) return;

      socket.userId = userId;

      // Stocker utilisateur en ligne
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, []);
      }

      if (!onlineUsers.get(userId).includes(socket.id)) {
        onlineUsers.get(userId).push(socket.id);
      }

      // Rejoindre room si conversation ouverte
      if (groupId) {
        socket.join("group_" + groupId);
      }

      if (recipientId) {
        const room = "private_" + [userId, recipientId].sort().join("_");
        socket.join(room);
      }

      await updateOnlineUsers(io);
    });

    // ================= SEND MESSAGE =================
    socket.on(
      "sendMessage",
      async ({ content, groupId, recipientId, userId }) => {
        if (!content?.trim()) return;

        try {
          // 1️⃣ Sauvegarde en base
          const msg = await Communication.create({
            content,
            groupId: groupId || null,
            recipientId: recipientId || null,
            userId,
            isRead: false,
          });

          const msgWithUser = await Communication.findByPk(msg.id, {
            include: [
              { model: User, attributes: ["id", "nom", "prenom"], as: "user" },
            ],
          });

          // ================= GROUPE =================
          if (groupId) {
            // Envoyer message aux utilisateurs qui ont ouvert la room
            socket.to("group_" + groupId).emit("receiveMessage", msgWithUser);

            // 🔔 Récupérer uniquement les membres du groupe
            const members = await GroupUser.findAll({
              where: { GroupId: groupId },
              attributes: ["UserId"],
            });

            for (const member of members) {
              const memberId = member.UserId;

              if (Number(memberId) === Number(userId)) continue;

              if (onlineUsers.has(memberId)) {
                onlineUsers.get(memberId).forEach((socketId) => {
                  io.to(socketId).emit("newMessageNotification", {
                    type: "group",
                    groupId,
                    from: msgWithUser.user,
                    content,
                  });
                });
              }
            }
          }

          // ================= MESSAGE PRIVE =================
          if (recipientId) {
            const room = "private_" + [userId, recipientId].sort().join("_");

            // Envoyer message si la conversation est ouverte
            socket.to(room).emit("receiveMessage", msgWithUser);

            // 🔔 Notification même si pas dans la room
            if (onlineUsers.has(recipientId)) {
              onlineUsers.get(recipientId).forEach((socketId) => {
                io.to(socketId).emit("newMessageNotification", {
                  type: "private",
                  from: msgWithUser.user,
                  content,
                  conversationWith: userId,
                });
              });
            }
          }
        } catch (err) {
          console.error("Erreur envoi message:", err);
        }
      },
    );

    // ================= DISCONNECT =================
    socket.on("disconnect", async () => {
      onlineUsers.forEach((sockets, userId) => {
        const filtered = sockets.filter((id) => id !== socket.id);

        if (filtered.length > 0) {
          onlineUsers.set(userId, filtered);
        } else {
          onlineUsers.delete(userId);
        }
      });

      await updateOnlineUsers(io);

      console.log("Utilisateur déconnecté:", socket.id);
    });
  });

  return io;
};

// ================= HELPER =================

const updateOnlineUsers = async (io) => {
  const usersData = await User.findAll({
    where: { id: Array.from(onlineUsers.keys()) },
    attributes: ["id", "nom", "prenom"],
  });

  for (const [uid, sockets] of onlineUsers.entries()) {
    const otherUsers = usersData.filter((u) => u.id !== Number(uid));

    sockets.forEach((socketId) => {
      io.to(socketId).emit("onlineUsers", otherUsers);
    });
  }
};
