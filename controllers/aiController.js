import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const askAI = async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Posez une question !" });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Tu es un assistant expert en gestion de messagerie, correction de texte et recherche d'information.
          Tes missions :
          1. Si l'utilisateur soumet un texte avec des fautes, corrige-le en gardant un ton professionnel.
          2. Si l'utilisateur pose une question, effectue une recherche logique et donne une réponse concise.
          3. Si le texte est long, propose d'en faire un résumé.
          Réponds toujours en français de manière polie et efficace.`,
        },
        { role: "user", content: question },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7, // Ajoute un peu de fluidité à la réponse
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || "";

    res.json({
      success: true,
      answer: aiResponse,
    });
  } catch (error) {
    console.error("Erreur Groq:", error);
    res.status(500).json({ success: false, error: "L'IA ne répond pas." });
  }
};

export const askAIInput = async (req, res) => {
  const { inputText } = req.body; // nom clair

  if (!inputText) {
    return res.status(400).json({ error: "Saisissez un texte !" });
  }

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Tu es un assistant qui propose des suggestions rapides de mots ou phrases pour accélérer la saisie. 
- Fournis 3 à 5 suggestions pertinentes en rapport avec ce que l'utilisateur écrit.
- Réponds uniquement par les suggestions, séparées par des lignes ou des puces.
- N'inclus pas d'explication.`,
        },
        { role: "user", content: inputText },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    const suggestions = chatCompletion.choices[0]?.message?.content
      ?.split("\n")
      .filter(Boolean) // supprime les lignes vides
      .map((s) => s.replace(/^[-•]\s*/, "")) // retire les puces
      .slice(0, 5); // garde max 5 suggestions

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("Erreur Groq:", error);
    res.status(500).json({ success: false, error: "L'IA ne répond pas." });
  }
};