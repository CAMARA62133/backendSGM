import jwt from "jsonwebtoken";


// Token longue durée : 3 jours
const maxAge = 3 * 24 * 60 * 60; // en secondes

const createToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN_SECRET, { expiresIn: maxAge });
};

// Token courte durée pour inactivité : 15 minutes
const generateShortToken = (id) => {
  return jwt.sign({ id }, process.env.TOKEN_SECRET, { expiresIn: "15m" });
};

export{ createToken, generateShortToken, maxAge };
