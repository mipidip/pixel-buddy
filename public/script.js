const bubble = document.getElementById("bubble");
const messages = document.getElementById("messages");

// 🧠 SOHBET GEÇMİŞİ HAFIZASI
let conversationHistory = [];

// 🎨 [YENİ]: O ANKİ AKTİF TEMAYI TUTAN DEĞİŞKEN
let currentTheme = "genel";

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

  // 🗣️ KONUŞMA BAŞLADIĞINDA: .talking sınıfını ve gelen temayı ekle
  utter.onstart = () => {
    if (pixelFace) {
      pixelFace.classList.add("talking");
      
      // Eğer gelen tema "genel" değilse, temaya özel CSS sınıfını giydir (Örn: theme-uzay)
      if (currentTheme !== "genel") {
        pixelFace.classList.add(`theme-${currentTheme}`);
      }
    }
  };

  // 🤫 KONUŞMA BİTTİĞİNDE: Tüm tema sınıflarını temizle ve eski mutlu sarı yüzüne dön
  utter.onend = () => {
    if (pixelFace) {
      pixelFace.className = "pixel-face"; // Tüm ek sınıfları sıfırlar, sadece ana sınıf kalır
    }
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
   LISTENING (SESLİ GİRİŞ)
====================== */

if (!SpeechRecognition) {
  bubble.textContent = "Üzgünüm, seni duyamıyorum.";
} else {
  const recognition = new SpeechRecognition();

  recognition.lang = "tr-TR";
  recognition.continuous = true; 
  recognition.interimResults = false; 
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
    const currentResultIndex = event.resultIndex;
    const childText = event.results[currentResultIndex][0].transcript;

    bubble.textContent = childText;
    addMessage(childText, "child");

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

      // [GÜNCELLEME]: Sunucudan gelen JSON paketini { reply, theme } olarak alıyoruz
      const data = await response.json();
      
      currentTheme = data.theme || "genel"; // Temayı hafızaya alıyoruz

      addMessage(data.reply, "bot");
      speak(data.reply); // Konuşmayı başlat (Tema sınıfları burada tetiklenecek)

      // 🧠 Sesli sohbet hafıza kaydı buraya da eklendi:
      conversationHistory.push({ role: "user", content: childText });
      conversationHistory.push({ role: "assistant", content: data.reply });

    } catch (error) {
      console.log("Brain error:", error);
      currentTheme = "genel";
      const fallback = "Hmm… beynim biraz dinleniyor. Tekrar dene 💛";
      addMessage(fallback, "bot");
      speak(fallback);
    }
  };

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
  
  if (!childText) return; 

  textInput.value = "";
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

    // [GÜNCELLEME]: Yazılı kısımda da gelen JSON paketini çözümlüyoruz
    const data = await response.json();
    
    currentTheme = data.theme || "genel"; // Temayı hafızaya alıyoruz

    addMessage(data.reply, "bot");
    speak(data.reply);

    conversationHistory.push({ role: "user", content: childText });
    conversationHistory.push({ role: "assistant", content: data.reply });

  } catch (error) {
    console.log("Brain error:", error);
    currentTheme = "genel";
    const fallback = "Hmm… beynim biraz dinleniyor. Tekrar dene 💛";
    addMessage(fallback, "bot");
    speak(fallback);
  }
}

sendBtn.addEventListener("click", handleTextMessage);

textInput.addEventListener("keypress", (event) => {
  if (event.key === "Enter") {
    handleTextMessage();
  }
});
