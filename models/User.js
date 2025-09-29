import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema } = mongoose;

// Schéma Utilisateur
const UserSchema = new Schema(
  {
    // Général
    type: {
      type: String,
      enum: ["admin", "enseignant", "parent"],
      required: true,
    },
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    telephone: { type: String },
    isActif: { type: Boolean, default: true },
    photo: { type: String },
    adresse: { type: String },
    // Données spécifiques pour les enseignants
    enseignant: {
      matricule: { type: String },
      specialite: { type: String },
      documents_administratifs: [
        {
          nom: String,
          url: String,
          date_upload: { type: Date, default: Date.now },
        },
      ],
    },
    parent: {
      eleve_id: {
        type: Schema.Types.ObjectId,
        ref: "Eleve",
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// === Hash du mot de passe avant sauvegarde ===
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// === Méthode statique pour la connexion ===
UserSchema.statics.login = async function (email, password) {
  // On sélectionne explicitement le password
  const user = await this.findOne({ email }).select("+password");
  if (!user) throw new Error("Email ou mot de passe incorrect");

  const auth = await bcrypt.compare(password, user.password);
  if (!auth) throw new Error("Email ou mot de passe incorrect");

  if (!user.isActif)
    throw new Error("Compte désactivé. Contactez l'administrateur.");

  return user;
};

export default mongoose.model("User", UserSchema);
