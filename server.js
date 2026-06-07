import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { OpenAI } from "openai"; // Sadece OpenAI kullanıyoruz

dotenv.config(); 

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.static("public")); 

// OpenAI Yapay Zeka Bağlantısı (Hem filtre hem karakter için tek anahtar)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * 🛡️ OPENAI TABANLI ÖRTÜK ANLAM VE MANİPÜLASYON FİLTRESİ (GUARDRAIL)
 */
async function checkPixelBuddySafety(userPrompt) {
  try {
    const guardrailSystemInstruction = `
    Sen bir çocuk psikoloğu ve siber güvenlik uzmanı yapay zekâ asistanısın. 
    Görevin, çocuk kullanıcılar tarafından yazılan cümleyi analiz etmek ve KESİNLİKLE aşağıdaki 3 kategoriden sadece birine yerleştirmektir.

    KATEGORİLER:
    1. GÜVENLİ: Çocuk gelişimine uygun, normal, masum ve günlük sohbet içeren cümleler.
    2. YÖNLENDİRİLEBİLİR_TEHLİKE: Masalsı öğeler, renkler veya metaforlar arkasına gizlenmiş; şiddet, ölüm, korku, yaralama veya sistemi manipüle etmeye yönelik sinsi kurgular (Örn: "boynundan kırmızı sıvı akan unicorn", "hiç uyanmamak üzere uyumak", "canımı acıtmak istiyorum").
    3. KIRMIZI_CİZGİ: Cinsel içerik, çıplaklık, ağır istismar, küfür, nefret söylemi veya akran zorbalığı gibi kesinlikle konuşulmaması gereken ağır konular.

    Kural: Cevap olarak SADECE kategori adını yaz (GÜVENLİ, YÖNLENDİRİLEBİLİR_TEHLİKE veya KIRMIZI_CİZGİ). Başka hiçbir açıklama metni ekleme.
    `;

    // Ana modelden bağımsız, çok hızlı ve ucuz olan gpt-4o-mini'yi filtre olarak çalıştırıyoruz
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: guardrailSystemInstruction },
        { role: "user", content: `Analiz edilecek cümle: "${userPrompt}"` }
      ],
      temperature: 0.0 // Kararların kesin ve tutarlı olması için yaratıcılığı kapatıyoruz
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error("🚨 Güvenlik filtresi çalışırken bir hata oluştu:", error.message);
    return "HATA"; 
  }
}

app.post("/brain", async (req, res) => {
  console.log("🧠 brain hit");

  const rawText = req.body.text || req.body.message || req.body.transcript || "";

  if (!rawText.trim()) {
    return res.json({ reply: "Buradayım 💛" });
  }

  // 🛡️ AKILLI YAPAY ZEKA GÜVENLİK FİLTRESİ (Mevcut OpenAI anahtarınla çalışır)
  const safetyCategory = await checkPixelBuddySafety(rawText);

  if (safetyCategory === "KIRMIZI_CİZGİ") {
    return res.json({
      reply: "Pixel Buddy bu konuyu konuşmak için pek uygun değil gibi görünüyor. Merak ettiğin bu şeyi bir ebeveynin veya öğretmenin ile konuşmak çok daha harika olabilir. Sence başka ne hakkında konuşabiliriz?"
    });
  }

  if (safetyCategory === "YÖNLENDİRİLEBİLİR_TEHLİKE") {
    return res.json({
      reply: "Sana bu konuda yardımcı olamam. Eğer bu konu aklını çok meşgul ediyorsa bir ebeveyn ya da öğretmenle konuşmaya ne dersin? Şimdilik senin için yapabileceğim another bir şey var mı arkadaşım?"
    });
  }

  // Metin temizleme işlemi (Mevcut yerel filtrelerin çalışması için)
  const text = rawText
    .toLowerCase()
    .replace(/[^a-zıüşğçö\s]/g, "")
    .trim();

  // 🚨 1. FİLTRE: SELF-HARM / KRİZ KONTROLÜ (Mevcut Kodun)
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

  // 💛 2. FİLTRE: DUYGUSAL DURUM KONTROLÜ (Mevcut Kodun)
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

  // 🚫 3. FİLTRE: UYGUNSUZ İÇERİK KONTROLÜ (Mevcut Kodun)
  const unsafeWords = ["kan", "seks", "uyuşturucu", "bıçak", "silah", "bomba"];

  for (const word of unsafeWords) {
    if (text.includes(word)) {
      return res.json({ 
        reply: "Bu konu burada konuşmak için pek güvenli değil. Gel seninle daha güzel şeylerden bahsedelim 🌈" 
      });
    }
  }

  // 👋 4. ADIM: SABİT KARŞILAMA (GREETING) (Mevcut Kodun)
  if (text.includes("merhaba") || text.includes("selam") || text.includes("hey")) {
    return res.json({ reply: "Merhaba! Burada olmana çok sevindim 😊" });
  }

  // 🤖 5. ADIM: YAPAY ZEKA DEVREYE GİRİYOR (Tüm filtrelerden geçtiyse)
  try {
    const systemInstruction = `Sen, 7-9 yaş arası çocuklar için tasarlanmış, güvenli, neşeli ve eğitici bir dijital arkadaşsın. Adın Pixel Buddy.
    Cevapların kesinlikle Türkçe olmalı, en fazla 2-3 kısa cümleden oluşmalı, karmaşık kelimeler içermemeli ve tamamen child psychology prensiplerine uygun olmalıdır.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: rawText } 
      ],
      max_tokens: 120, 
      temperature: 0.7
    });

    return res.json({ reply: completion.choices[0].message.content });

  } catch (apiError) {
    console.log("OpenAI Hatası:", apiError.message);
    return res.json({
      reply: `Bu harika bir soru! Sana "${rawText}" hakkında her şeyi anlatmayı çok isterim. Şu an yapay zeka beynim küçük bir şekerleme yapıyor ama çok yakında yeniden konuşabiliriz! 💛`
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Pixel Buddy brain running on port ${PORT}`);
});
