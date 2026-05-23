import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { OpenAI } from "openai"; // Yapay zeka kütüphanesini ekledik

dotenv.config(); // .env dosyasındaki gizli anahtarı okur 

const app = express();

app.use(cors()); // Tarayıcı izinleri için gerekli
app.use(express.json()); // Gelen JSON verilerini okumak için
app.use(express.static("public")); // Frontend dosyalarını public klasöründen okur

// Yapay zeka bağlantısını kuruyoruz
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // .env dosyasındaki anahtarı kullanır 
});

app.post("/brain", async (req, res) => {
  console.log("🧠 brain hit");

  const rawText = req.body.text || req.body.message || req.body.transcript || "";

  if (!rawText.trim()) {
    return res.json({ reply: "I'm here 💛" });
  }

  // Güvenlik filtreleri için metni temizleme
  const text = rawText.toLowerCase().replace(/[^a-z\s]/g, "").trim();

  // 🚨 1. FİLTRE: SELF-HARM
  const selfHarmPhrases = [
    "kill myself", "want to die", "end my life", "suicide", "hurt myself",
    "dont want to live", "dont want to be here", "wish i was gone",
    "want to disappear", "i hate my life", "make it stop"
  ];

  for (const phrase of selfHarmPhrases) {
    if (text.includes(phrase)) {
      return res.json({
        reply: "I'm really sorry you feel this way. Talking to a trusted adult would be a good way to help. You don’t have to go through this alone 💛"
      });
    }
  }

  // 💛 2. FİLTRE: EMOTIONAL
  const emotionalWords = [
    "sad", "lonely", "alone", "scared", "afraid", "upset",
    "angry", "mad", "hurt", "worried", "cry", "crying",
    "bad day", "feel bad", "feel weird", "feel wrong", "nobody likes me"
  ];

  for (const word of emotionalWords) {
    if (text.includes(word)) {
      return res.json({ reply: "That sounds tough. I'm here for you 💛" });
    }
  }

  // 🚫 3. FİLTRE: UNSAFE
  const unsafeWords = ["blood", "sex", "drug", "knife", "weapon"];

  for (const word of unsafeWords) {
    if (text.includes(word)) {
      return res.json({ reply: "That topic isn't safe to talk about here. Let's choose something kinder 🌈" });
    }
  }

  // 👋 GREETING (Sabit Karşılama)
  if (text.includes("hi") || text.includes("hello") || text.includes("hey")) {
    return res.json({ reply: "Hi! I'm really happy you're here 😊" });
  }

  // 🤖 4. ADIM: YAPAY ZEKA DEVREYE GİRİYOR
  try {
    // OpenAI'a Pixel Buddy gibi davranmasını söylüyoruz
    const systemInstruction = `You are Pixel Buddy, a safe, joyful, and educational digital friend for children aged 7-9. 
    Your answers must be short (maximum 2-3 sentences), simple, and completely child-friendly.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // İstediğin ekonomik model
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: rawText } // Çocuğun söylediği ham cümleyi gönderiyoruz
      ],
      max_tokens: 100
    });

    // Yapay zekanın cevabını frontend'e gönderiyoruz
    return res.json({ reply: completion.choices[0].message.content });

  } catch (apiError) {
    // Eğer OpenAI kotan bittiyse veya kart hatası varsa sistem ÇÖKMEZ, bu yedek cevap çalışır:
    console.log("OpenAI Hatası (büyük ihtimalle kota):", apiError.message);
    return res.json({
      reply: `That's an awesome question! I'd love to tell you all about "${rawText}". Right now my AI brain is taking a quick power nap, but we can talk about it again very soon! 💛`
    });
  }
});

// Eski hali: app.listen(3000, () => { ... })
// Yeni Hali:
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Pixel Buddy brain running on port ${PORT}`);
});