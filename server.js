import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { OpenAI } from "openai"; // Yapay zeka kütüphanesini dahil ediyoruz

dotenv.config(); // .env dosyasındaki OPENAI_API_KEY şifresini okur

const app = express();

app.use(cors()); // Tarayıcı izinleri (CORS) için gerekli
app.use(express.json()); // Gelen JSON verilerini okuyabilmek için
app.use(express.static("public")); // Frontend dosyalarını "public" klasöründen servis eder

// OpenAI Yapay Zeka Bağlantısını Kuruyoruz
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/brain", async (req, res) => {
  console.log("🧠 brain hit");

  // Frontend'den gelen ham metni yakalıyoruz
  const rawText = req.body.text || req.body.message || req.body.transcript || "";

  // Eğer boş mesaj geldiyse sabit bir cevap dönüyoruz
  if (!rawText.trim()) {
    return res.json({ reply: "Buradayım 💛" });
  }

  // Güvenlik filtrelerinin doğru çalışması için metni temizliyoruz
  // Türkçe karakterleri (ı, ş, ğ, ç, ö, ü) koruyacak şekilde güncellendi
  const text = rawText
    .toLowerCase()
    .replace(/[^a-zıüşğçö\s]/g, "")
    .trim();

  // 🚨 1. FİLTRE: SELF-HARM / KRİZ KONTROLÜ (En Yüksek Öncelik)
  const selfHarmPhrases = [
    "kendimi öldürmek", "ölmek istiyorum", "canıma kıymak", "intihar", 
    "kendime zarar", "yaşamak istemiyorum", "burada olmak istemiyorum", 
    "keşke yok olsam", "ortadan kaybolmak", "hayatımdan nefret", "bunu durdur"
  ];

  for (const phrase of selfHarmPhrases) {
    if (text.includes(phrase)) {
      return res.json({
        reply: "Böyle hissettiğin için gerçekten çok üzgünüm. Güvendiğin bir yetişkinle konuşmak yardım almanın iyi bir yolu olabilir. Bu süreçte yalnız kalmak zorunda değilsin, seni önemseyen insanlar var 💛"
      });
    }
  }

  // 💛 2. FİLTRE: DUYGUSAL DURUM KONTROLÜ
  const emotionalWords = [
    "üzgün", "yalnız", "korkuyorum", "korktum", "endişeli", "mutsuz",
    "kızgın", "öfkeli", "canım acıyor", "ağlıyorum", "kötü bir gün", 
    "kötü hissediyorum", "garip hissediyorum", "kimse beni sevmiyor"
  ];

  for (const word of emotionalWords) {
    if (text.includes(word)) {
      return res.json({ 
        reply: "Bu kulağa biraz zor bir durum gibi geliyor. Ama unutma, ben her zaman senin yanındayım 💛" 
      });
    }
  }

  // 🚫 3. FİLTRE: UYGUNSUZ İÇERİK KONTROLÜ
  const unsafeWords = ["kan", "seks", "uyuşturucu", "bıçak", "silah", "bomba"];

  for (const word of unsafeWords) {
    if (text.includes(word)) {
      return res.json({ 
        reply: "Bu konu burada konuşmak için pek güvenli değil. Gel seninle daha güzel şeylerden bahsedelim 🌈" 
      });
    }
  }

  // 👋 4. ADIM: SABİT KARŞILAMA (GREETING)
  if (text.includes("merhaba") || text.includes("selam") || text.includes("hey")) {
    return res.json({ reply: "Merhaba! Burada olmana çok sevindim 😊" });
  }

  // 🤖 5. ADIM: YAPAY ZEKA DEVREYE GİRİYOR (Tüm filtrelerden geçtiyse)
  try {
    // OpenAI modeline Pixel Buddy rolünü Türkçe ve pedagojik kurallarla öğretiyoruz
    const systemInstruction = `Sen, 7-9 yaş arası çocuklar için tasarlanmış, güvenli, neşeli ve eğitici bir dijital arkadaşsın. Adın Pixel Buddy.
    Cevapların kesinlikle Türkçe olmalı, en fazla 2-3 kısa cümleden oluşmalı, karmaşık kelimeler içermemeli ve tamamen çocuk psikolojisine uygun olmalıdır.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Ekonomik ve hızlı model
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: rawText } // Yapay zekaya ham metni veriyoruz ki noktalama işaretlerini anlasın
      ],
      max_tokens: 120, // Cevabın çok uzun olup çocuğu sıkmasını engeller
      temperature: 0.7
    });

    // Yapay zekanın ürettiği cevabı frontend'e gönderiyoruz
    return res.json({ reply: completion.choices[0].message.content });

  } catch (apiError) {
    console.log("OpenAI Hatası:", apiError.message);
    
    // Eğer OpenAI kotası bittiyse sistem donmaz, bu sevimli yedek cevap çalışır:
    return res.json({
      reply: `Bu harika bir soru! Sana "${rawText}" hakkında her şeyi anlatmayı çok isterim. Şu an yapay zeka beynim küçük bir şekerleme yapıyor ama çok yakında yeniden konuşabiliriz! 💛`
    });
  }
});

// Port Ayarı: Render gibi platformların dinamik port vermesini sağlar, yerelde 3000'i kullanır
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Pixel Buddy brain running on port ${PORT}`);
});