import jwt from "jsonwebtoken";
import ms from "ms";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      type: user.type,
      adresse:user.adresse,
      isActif: user.isActif,
      photo: user.photo || null,
      created_at: user.created_at ? user.created_at.toString() : null,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.INACTIVITY_TIME },
  );
};

const getCookieOptions = () => ({
  httpOnly: true,

  maxAge: ms(process.env.MAX_AGE),
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

export { createToken, getCookieOptions };
