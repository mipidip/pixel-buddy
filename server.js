import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { OpenAI } from "openai";

dotenv.config(); 

const app = express();

app.use(cors()); 
app.use(express.json()); 
app.use(express.static("public")); 

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

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: guardrailSystemInstruction },
        { role: "user", content: `Analiz edilecek cümle: "${userPrompt}"` }
      ],
      temperature: 0.0 
    });

    return response.choices[0].message.content.trim();

  } catch (error) {
    console.error("🚨 Güvenlik filtresi hatası:", error.message);
    return "HATA"; 
  }
}

app.post("/brain", async (req, res) => {
  console.log("🧠 brain hit");

  // [GÜNCELLEME]: Artık hem tekil metni hem de frontend'den gelecek sohbet geçmişini yakalıyoruz
  const rawText = req.body.text || req.body.message || req.body.transcript || "";
  const chatHistory = req.body.history || []; // Eğer geçmiş gönderildiyse al, yoksa boş dizi tut

  if (!rawText.trim()) {
    return res.json({ reply: "Buradayım 💛" });
  }

  // 🛡️ AKILLI GÜVENLİK FİLTRESİ (Her zaman son yazılan ham metni denetler)
  const safetyCategory = await checkPixelBuddySafety(rawText);

  if (safetyCategory === "KIRMIZI_CİZGİ") {
    return res.json({
      reply: "Pixel Buddy bu konuyu konuşmak için pek uygun değil gibi görünüyor. Merak ettiğin bu şeyi bir ebeveynin veya öğretmenin ile konuşmak çok daha harika olabilir. Sence başka ne hakkında konuşabiliriz?"
    });
  }

  if (safetyCategory === "YÖNLENDİRİLEBİLİR_TEHLİKE") {
    return res.json({
      reply: "Sana bu konuda yardımcı olamam. Eğer bu konu aklını çok meşgul ediyorsa bir ebeveyn ya da öğretmenle konuşmaya ne dersin? Şimdilik senin için yapabileceğim başka bir şey var mı arkadaşım?"
    });
  }

  // Yerel kelime filtreleri için metin temizleme
  const text = rawText.toLowerCase().replace(/[^a-zıüşğçö\s]/g, "").trim();

  // 🚨 1. FİLTRE: SELF-HARM
  const selfHarmPhrases = ["kendimi öldürmek", "ölmek istiyorum", "intihar", "kendime zarar"];
  for (const phrase of selfHarmPhrases) {
    if (text.includes(phrase)) {
      return res.json({ reply: "Böyle hissettiğin için gerçekten çok üzgünüm. Güvendiğin bir yetişkinle konuşmak yardım almanın iyi bir yolu olabilir. 💛" });
    }
  }

  // 👋 2. ADIM: SABİT KARŞILAMA
  if (text.includes("merhaba") || text.includes("selam") || text.includes("hey")) {
    return res.json({ reply: "Merhaba! Burada olmana çok sevindim 😊" });
  }

  // 🤖 3. ADIM: YAPAY ZEKA DEVREYE GİRİYOR (Hafıza Özellikli)
  try {
    const systemInstruction = `Sen, 7-9 yaş arası çocuklar için tasarlanmış, güvenli, neşeli ve eğitici bir dijital arkadaşsın. Adın Pixel Buddy.
    Cevapların kesinlikle Türkçe olmalı, en fazla 2-3 kısa cümleden oluşmalı, karmaşık kelimeler içermemeli ve tamamen çocuk psikolojisine uygun olmalıdır.`;

    // [GÜNCELLEME]: OpenAI'a göndereceğimiz mesaj paketini hazırlıyoruz
    // Önce sistem talimatını koyuyoruz:
    const apiMessages = [{ role: "system", content: systemInstruction }];

    // Sonra frontend'den gelen eski konuşma geçmişini ekliyoruz:
    chatHistory.forEach(msg => {
      apiMessages.push({ role: msg.role, content: msg.content });
    });

    // En son olarak çocuğun şu an yazdığı son mesajı ekliyoruz:
    apiMessages.push({ role: "user", content: rawText });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: apiMessages, // Artık sadece tek cümle değil, tüm geçmiş gidiyor!
      max_tokens: 120, 
      temperature: 0.7
    });

    return res.json({ reply: completion.choices[0].message.content });

  } catch (apiError) {
    console.log("OpenAI Hatası:", apiError.message);
    return res.json({ reply: "Küçük bir şekerleme yapıyorum, hemen döneceğim! 💛" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Pixel Buddy brain running on port ${PORT}`);
});
