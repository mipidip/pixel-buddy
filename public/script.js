const bubble = document.getElementById("bubble");
const messages = document.getElementById("messages");

// 🧠 [YENİ]: SOHBET GEÇMİŞİ HAFIZASI
// Sayfa açık kaldığı sürece çocuğun tarayıcısında konuşmaları biriktirir
let conversationHistory = [];

/* ======================
   SPEECH SETUP
====================== */

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const synth = window.speechSynthesis;
let voices = [];

synth.onvoiceschanged = () => {
  voices = synth.getVoices();
};

function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  
  // HTML'deki piksel yüz elementini yakalıyoruz
  const pixelFace = document.querySelector(".pixel-face");
  
  const allVoices = synth.getVoices();
  let turkishVoice = allVoices.find(v => v.lang === "tr-TR" && v.name.includes("Google"));
  
  if (!turkishVoice) {
    turkishVoice = allVoices.find(v => v.lang.startsWith("tr"));
  }

  if (turkishVoice) {
    utter.voice = turkishVoice;
  }

  utter.rate = 0.85; 
  utter.pitch = 1.15; 

  // 🗣️ KONUŞMA BAŞLADIĞINDA: .talking sınıfını ekle (Animasyon başlar)
  utter.onstart = () => {
    if (pixelFace) pixelFace.classList.add("talking");
  };

  // 🤫 KONUŞMA BİTTİĞİNDE: .talking sınıfını kaldır (Animasyon durur)
  utter.onend = () => {
    if (pixelFace) pixelFace.classList.remove("talking");
  };

  synth.cancel(); 
  synth.speak(utter);
}

/* ======================
   CHAT UI
====================== */

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;

  if (type === "child") {
    div.textContent = "You: " + text;
  } else {
    div.textContent = "Buddy: " + text;
  }

  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

/* ======================
   LISTENING
====================== */

if (!SpeechRecognition) {
  bubble.textContent = "Üzgünüm, seni duyamıyorum.";
} else {
  const recognition = new SpeechRecognition();

  recognition.lang = "tr-TR";
  
  // 🌟 [GÜNCELLEME 1]: Kesintisiz dinlemeyi açıyoruz. 
  // Çocuk nefes alsa veya duraksasa bile mikrofon pat diye kapanmayacak, dinlemeye devam edecek.
  recognition.continuous = true; 
  
  // 🌟 [GÜNCELLEME 2]: Çocuk konuşurken ara sonuçları değil, sadece kesinleşen cümleyi bekliyoruz.
  recognition.interimResults = false; 
  
  // 🌟 [GÜNCELLEME 3]: Tarayıcının en doğru tahmine odaklanmasını sağlıyoruz.
  recognition.maxAlternatives = 1; 

  function startListening() {
    try {
      recognition.abort();
    } catch (e) {}

    bubble.textContent = "Dinliyorum...";
    recognition.start();
  }

  recognition.onstart = () => {
    console.log("🎤 Mikrofon açık");
  };

  recognition.onresult = async (event) => {
    // 🌟 [GÜNCELLEME 4]: continuous: true yaptığımız için gelen son konuşma paketini yakalıyoruz
    const currentResultIndex = event.resultIndex;
    const childText = event.results[currentResultIndex][0].transcript;

    bubble.textContent = childText;
    addMessage(childText, "child");

    // 🌟 [GÜNCELLEME 5]: Çocuk cümlesini bitirip veri geldikten sonra, yeni bir cümle için 
    // mikrofonu arka planda açık tutmaya devam edebiliriz ama akışı temiz yönetmek için şimdilik durduruyoruz.
    recognition.stop(); 

    try {
      const response = await fetch("/brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text: childText,
          history: conversationHistory 
        })
      });

      if (!response.ok) {
        throw new Error("Brain offline");
      }

      const data = await response.json();

      addMessage(data.reply, "bot");
      speak(data.reply);

    } catch (error) {
      console.log("Brain error:", error);
      const fallback = "Hmm… beynim biraz dinleniyor. Tekrar dene 💛";
      addMessage(fallback, "bot");
      speak(fallback);
    }
  };

  // Diğer onerror ve onend fonksiyonların aynen kalabilir...

  recognition.onerror = (event) => {
    console.log("Speech error:", event.error);
    bubble.textContent = "Mikrofon problemi. Tekrar dene 🎤";
  };

  recognition.onend = () => {
    bubble.textContent = "Konuşmak için mikrofona tekrar bas 🎤";
  };

  window.startListening = startListening;
}
/* ======================
   YAZILI MESAJ GÖNDERME MANTIĞI
====================== */
const textInput = document.getElementById("textInput");
const sendBtn = document.getElementById("sendBtn");

async function handleTextMessage() {
  const childText = textInput.value.trim();
  
  if (!childText) return; // Boş mesajsa hiçbir şey yapma

  // Giriş kutusunu temizle
  textInput.value = "";

  // ❌ BURADAKİ bubble.textContent = childText; SATIRINI SİLDİK!
  // Böylece mikrofonun üstündeki balonun yönlendirmesi asla bozulmayacak.

  // Ekranda mesajı sadece sağdaki sohbet geçmişine ekliyoruz
  addMessage(childText, "child");

  try {
    const response = await fetch("/brain", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ 
        text: childText,
        history: conversationHistory 
      })
    });

    if (!response.ok) {
      throw new Error("Brain offline");
    }

    const data = await response.json();

    addMessage(data.reply, "bot");
    speak(data.reply);

    conversationHistory.push({ role: "user", content: childText });
    conversationHistory.push({ role: "assistant", content: data.reply });

  } catch (error) {
    console.log("Brain error:", error);
    const fallback = "Hmm… beynim biraz dinleniyor. Tekrar dene 💛";
    addMessage(fallback, "bot");
    speak(fallback);
  }
}

// Butona tıklandığında gönder
sendBtn.addEventListener("click", handleTextMessage);

// Kutunun içindeyken Enter tuşuna basıldığında gönder
textInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    handleTextMessage();
  }
});
