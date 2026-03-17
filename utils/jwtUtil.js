import jwt from "jsonwebtoken";
import ms from "ms";

const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: user.type,
      secteur_activite: user.secteur_activite,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone,
      isActif: user.isActif,
      photo: user.photo || null,
      doitChangerPassword: user.doitChangerPassword,
      entreprise: user.entreprise,
      adresse: user.adresse,
      pays: user.pays,
      pays_code: user.pays_code,
      region: user.region,
      createdAt: user.createdAt ? user.createdAt.toString() : null,
      updatedAt: user.updatedAt ? user.updatedAt.toString() : null,
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
