// ✅ Toujours importer depuis l'index pour avoir les relations prêtes
import {
  Poll,
  PollOption,
  PollVote,
  Communication,
  User,
  sequelize,
} from "../models/index.js";

/* =====================================================
    📊 CREATE POLL
===================================================== */
export const createPoll = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { question, options, groupId, expiresIn } = req.body;
    const userId = req.user.id;

    // 1. Créer le sondage
    const poll = await Poll.create(
      {
        question,
        createdBy: userId,
        groupId,
        expiresAt: new Date(Date.now() + expiresIn * 60 * 60 * 1000),
        isActive: true,
      },
      { transaction },
    );

    // 2. Créer les options
    await Promise.all(
      options.map((text) =>
        PollOption.create(
          {
            pollId: poll.id,
            text,
            votes: 0,
          },
          { transaction },
        ),
      ),
    );

    // 3. Créer le message de communication lié au sondage
    const message = await Communication.create(
      {
        content: `📊 SONDAGE: ${question}`,
        userId,
        groupId,
        pollId: poll.id,
      },
      { transaction },
    );

    await transaction.commit();

    // 4. Récupérer le message avec tout le contenu pour Socket.io
    const messageWithPoll = await Communication.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "user", 
          attributes: ["id", "nom", "prenom", "photo"],
        },
        {
          model: Poll,
          as: "poll",
          include: [{ model: PollOption, as: "options" }],
        },
      ],
    });

    req.io.to(`group_${groupId}`).emit("newPoll", messageWithPoll);
    res.json({ success: true, data: messageWithPoll });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erreur createPoll:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
    🗳️ VOTE POLL
===================================================== */
export const votePoll = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { pollId } = req.params;
    const { optionId } = req.body;
    const userId = req.user.id;

    const poll = await Poll.findByPk(pollId);

    if (!poll || !poll.isActive) {
      return res.status(400).json({ message: "Sondage terminé" });
    }

    if (new Date(poll.expiresAt) < new Date()) {
      await poll.update({ isActive: false });
      return res.status(400).json({ message: "Sondage expiré" });
    }

    const existingVote = await PollVote.findOne({
      where: { pollId, userId },
    });

    if (existingVote) {
      return res.status(400).json({ message: "Vous avez déjà voté" });
    }

    // ✅ Créer le vote
    await PollVote.create({ pollId, optionId, userId }, { transaction });

    // ✅ Incrémenter le compteur
    await PollOption.increment("votes", {
      where: { id: optionId },
      transaction,
    });

    await transaction.commit();

    // 🔄 Récupérer le sondage mis à jour pour les clients
    const updatedPoll = await Poll.findByPk(pollId, {
      include: [{ model: PollOption, as: "options" }],
    });

    req.io.emit("pollUpdated", updatedPoll); // Diffuser à tout le monde
    res.json({ success: true, data: updatedPoll });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Erreur votePoll:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =====================================================
    📈 GET POLL RESULTS
===================================================== */
export const getPollResults = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await Poll.findByPk(pollId, {
      include: [
        {
          model: PollOption,
          as: "options",
          include: [
            {
              model: PollVote,
              as: "votesList", // ⚠️ Vérifie que cet alias est défini dans index.js pour PollOption -> PollVote
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["id", "nom", "prenom", "photo"],
                },
              ],
            },
          ],
        },
      ],
    });

    res.json({ success: true, data: poll });
  } catch (error) {
    console.error("Erreur getPollResults:", error);
    res.status(500).json({ message: error.message });
  }
};
