import { Server } from "socket.io";
import User from "../models/User.js";
import Communication from "../models/Communication.js";
import { GroupUser } from "../models/group.js";
import { DNDSettings } from "../models/index.js";
import { getConversationId } from "./idHelper.js";

export const onlineUsers = new Map(); // userId -> [socketIds]

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    // 1️⃣ REJOINDRE UNE CONVERSATION
    socket.on("joinConversation", async ({ userId, groupId, recipientId }) => {
      if (!userId) return;
      socket.userId = Number(userId);

      if (!onlineUsers.has(socket.userId)) onlineUsers.set(socket.userId, []);
      if (!onlineUsers.get(socket.userId).includes(socket.id)) {
        onlineUsers.get(socket.userId).push(socket.id);
      }

      if (groupId) socket.join("group_" + Number(groupId));
      if (recipientId) {
        const room =
          "private_" + [socket.userId, Number(recipientId)].sort().join("_");
        socket.join(room);
      }

      await updateOnlineUsersByCompany(io, socket.userId);
    });

    // 2️⃣ ENVOYER UN MESSAGE (Avec DND et Auto-Reply)
    socket.on("sendMessage", async ({ content, groupId, recipientId }) => {
      const userId = socket.userId;
      if (!userId || !content?.trim()) return;

      try {
        // Identification de la conversation
        let conversationId = groupId
          ? groupId.toString()
          : getConversationId(userId, recipientId);

        let notify = true;
        let autoReply = null;

        // --- Logique DND pour les messages privés ---
        if (recipientId && !groupId) {
          // Chercher DND spécifique puis global
          let dnd =
            (await DNDSettings.findOne({
              where: {
                userId: Number(recipientId),
                conversationId: conversationId,
              },
            })) ||
            (await DNDSettings.findOne({
              where: { userId: Number(recipientId), conversationId: null },
            }));

          if (dnd && dnd.enabled) {
            const nowHour = new Date().getHours();
            let inDND = true;

            // Vérification horaire
            if (dnd.schedule) {
              const [start, end] = dnd.schedule.split("-").map(Number);
              inDND =
                start < end
                  ? nowHour >= start && nowHour < end
                  : nowHour >= start || nowHour < end;
            }

            // Vérification mots-clés (ignore le DND si mot-clé présent)
            const containsKeyword = (dnd.keywords || []).some((kw) =>
              content.toLowerCase().includes(kw.toLowerCase()),
            );

            if (inDND && !containsKeyword) {
              notify = false;
              autoReply = dnd.autoReply;
            }
          }
        }

        // Sauvegarde du message initial
        const msg = await Communication.create({
          content,
          groupId: groupId ? Number(groupId) : null,
          recipientId: recipientId ? Number(recipientId) : null,
          userId,
          conversationId,
          isRead: false,
        });

        const msgWithUser = await Communication.findByPk(msg.id, {
          include: [
            { model: User, attributes: ["id", "nom", "prenom"], as: "user" },
          ],
        });

        // --- Diffusion du message ---
        if (groupId) {
          // Logique Groupe
          socket
            .to("group_" + Number(groupId))
            .emit("receiveMessage", msgWithUser);
          const members = await GroupUser.findAll({
            where: { groupId: Number(groupId) },
          });
          members.forEach((m) => {
            if (m.userId !== userId && onlineUsers.has(m.userId)) {
              onlineUsers
                .get(m.userId)
                .forEach((sId) =>
                  io
                    .to(sId)
                    .emit("newMessageNotification", {
                      type: "group",
                      groupId,
                      from: msgWithUser.user,
                      content,
                    }),
                );
            }
          });
        } else if (recipientId) {
          // Logique Privée
          const room =
            "private_" + [userId, Number(recipientId)].sort().join("_");

          if (notify) {
            socket.to(room).emit("receiveMessage", msgWithUser);
            if (onlineUsers.has(Number(recipientId))) {
              onlineUsers.get(Number(recipientId)).forEach((sId) =>
                io.to(sId).emit("newMessageNotification", {
                  type: "private",
                  from: msgWithUser.user,
                  content,
                  conversationWith: userId,
                }),
              );
            }
          } else if (autoReply) {
            // Création automatique de la réponse système
            const autoMsg = await Communication.create({
              content: autoReply,
              userId: Number(recipientId),
              recipientId: userId,
              conversationId,
              isRead: false,
              system: true,
            });

            const autoMsgWithUser = await Communication.findByPk(autoMsg.id, {
              include: [
                {
                  model: User,
                  attributes: ["id", "nom", "prenom"],
                  as: "user",
                },
              ],
            });

            // Envoyer l'auto-reply uniquement à l'expéditeur initial
            onlineUsers
              .get(userId)
              ?.forEach((sId) =>
                io.to(sId).emit("receiveMessage", autoMsgWithUser),
              );
          }
        }
      } catch (err) {
        console.error("❌ socket error:", err);
      }
    });

    // 3️⃣ DÉCONNEXION
    socket.on("disconnect", async () => {
      const uId = socket.userId;
      if (uId && onlineUsers.has(uId)) {
        const filtered = onlineUsers.get(uId).filter((id) => id !== socket.id);
        if (filtered.length > 0) onlineUsers.set(uId, filtered);
        else onlineUsers.delete(uId);
        await updateOnlineUsersByCompany(io, uId);
      }
    });
  });

  return io;
};

const updateOnlineUsersByCompany = async (io, currentUserId) => {
  try {
    const onlineIds = Array.from(onlineUsers.keys());
    const usersOnline = await User.findAll({
      where: { id: onlineIds },
      attributes: ["id", "entreprise"],
    });
    const companyMap = {};
    usersOnline.forEach((u) => {
      if (!companyMap[u.entreprise]) companyMap[u.entreprise] = [];
      companyMap[u.entreprise].push(u.id);
    });

    for (const [userId, sockets] of onlineUsers.entries()) {
      const user = await User.findByPk(userId, { attributes: ["entreprise"] });
      if (!user) continue;
      const companyOnlineIds = companyMap[user.entreprise] || [];
      sockets.forEach((socketId) =>
        io.to(socketId).emit("onlineUsersBadge", companyOnlineIds),
      );
    }
  } catch (err) {
    console.error("Erreur updateOnlineUsers:", err);
  }
};
