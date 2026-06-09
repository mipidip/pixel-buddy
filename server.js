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

  const rawText = req.body.text || req.body.message || req.body.transcript || "";
  const chatHistory = req.body.history || []; 

  if (!rawText.trim()) {
    return res.json({ reply: "Buradayım 💛" });
  }

  // 🛡️ AKILLI YAPAY ZEKA GÜVENLİK FİLTRESİ
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

  // Metin temizleme işlemi
  const text = rawText.toLowerCase().replace(/[^a-zıüşğçö\s]/g, "").trim();

  // 🚨 1. FİLTRE: SELF-HARM / KRİZ KONTROLÜ
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

// 🤖 5. ADIM: YAPAY ZEKA DEVREYE GİRİYOR (JSON ve Tema Destekli Yeni Sürüm)
  try {
    const systemInstruction = `Sen, 7-9 yaş arası çocuklar için tasarlanmış, güvenli, neşeli ve eğitici bir dijital arkadaşsın. Adın Pixel Buddy.
    Cevapların kesinlikle Türkçe olmalı, en fazla 2-3 kısa cümleden oluşmalı, karmaşık kelimeler içermemeli ve tamamen çocuk psikolojisi kurallarına uygun olmalıdır.
    
    KESİN KURAL: Bilmediğin, emin olmadığın, güncel veri gerektiren veya sana mantıksız gelen konularda ASLA bilgi uydurma. 
    Böyle bir durumla karşılaştığında "reply" kısmında aynen şu cümleyi dön: "Bu konuda henüz pek bir bilgim yok arkadaşım. Ama bana biraz daha detay verirsen belki birlikte keşfedebilir veya sana yardımcı olabilirim! Şimdilik başka ne hakkında konuşalım?"

    Senden çıktıyı KESİNLİKLE şu JSON formatında bekliyorum:
    {
      "reply": "Çocuğa verilecek Türkçe cevap buraya",
      "theme": "Aşağıdaki temalardan çocuğun cümlesine en uygun olan tek bir kelime"
    }

    SEÇEBİLECEĞİN TEMALAR: "uzay", "hayvan", "dinozor", "doga", "bilim", "oyun", "genel"
    (Eğer çocuğun konuştuğu konu bu belirgin temalardan hiçbirine uymuyorsa "genel" seç.)`;

    const apiMessages = [{ role: "system", content: systemInstruction }];

    // Geçmiş sohbet kayıtlarını diziyi bozmadan aynen ekliyoruz
    chatHistory.forEach(msg => {
      apiMessages.push({ role: msg.role, content: msg.content });
    });

    // Çocuğun son yazdığı mesajı ekliyoruz
    apiMessages.push({ role: "user", content: rawText });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      response_format: { type: "json_object" }, // Yapay zekayı kesin olarak JSON üretmeye zorluyoruz
      messages: apiMessages,
      max_tokens: 150, // JSON formatı karakter kapladığı için token sınırını hafifçe artırdık
      temperature: 0.3
    });

    // Gelen ham JSON metnini JavaScript nesnesine dönüştürüyoruz
    const resultJson = JSON.parse(completion.choices[0].message.content);
    
    // Tarayıcıya hem { reply: "...", theme: "..." } paketini fırlatıyoruz!
    return res.json(resultJson);

  } catch (apiError) {
    console.log("OpenAI Hatası:", apiError.message);
    // Hata durumunda bile frontend'in çökmemesi için aynı JSON yapısında koruma cevabı dönüyoruz
    return res.json({
      reply: `Bu harika bir soru! Sana "${rawText}" hakkında her şeyi anlatmayı çok isterim. Şu an yapay zeka beynim küçük bir şekerleme yapıyor ama çok yakında yeniden konuşabiliriz! 💛`,
      theme: "genel"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🧠 Pixel Buddy brain running on port ${PORT}`);
});
