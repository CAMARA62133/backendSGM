import mongoose from "mongoose";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connecté avec succès");
  } catch (e) {
    console.error("❌ Erreur de connexion à MongoDB :", e.message);
    process.exit(1);
  }
};

export default connectDB;
