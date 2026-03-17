import crypto from "crypto";

/**
 * Génère un ID de conversation unique et déterministe pour deux utilisateurs.
 */
export const getConversationId = (id1, id2) => {
  const [a, b] = [Number(id1), Number(id2)].sort((x, y) => x - y);
  const hash = crypto.createHash("md5").update(`dm-${a}-${b}`).digest("hex");
  // Retourne un ID basé sur le hash pour rester cohérent avec ta base de données
  return parseInt(hash.slice(0, 8), 16).toString();
};
