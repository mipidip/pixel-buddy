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
  
  const allVoices = synth.getVoices();
  
  let turkishVoice = allVoices.find(v => v.lang === "tr-TR" && v.name.includes("Google"));
  
  if (!turkishVoice) {
    turkishVoice = allVoices.find(v => v.lang.startsWith("tr"));
  }

  if (turkishVoice) {
    utter.voice = turkishVoice;
    console.log("Seçilen Türkçe Ses:", turkishVoice.name);
  } else {
    console.log("Sistemde yerel Türkçe ses bulunamadı, varsayılan ses kullanılıyor.");
  }

  utter.rate = 0.85; 
  utter.pitch = 1.15; 

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
  recognition.interimResults = false;
  recognition.continuous = false;

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
    const childText = event.results[0][0].transcript;

    bubble.textContent = childText;
    addMessage(childText, "child");

    try {
      // 🚀 [GÜNCELLEME]: Sunucuya hem son mesajı hem de biriken geçmişi gönderiyoruz
      const response = await fetch("/brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          text: childText,
          history: conversationHistory // Hafızayı buraya paslıyoruz
        })
      });

      if (!response.ok) {
        throw new Error("Brain offline");
      }

      const data = await response.json();

      addMessage(data.reply, "bot");
      speak(data.reply);

      // 🧠 [YENİ]: BAŞARILI CEVAPTAN SONRA HAFIZAYI GÜNCELLE
      // Bu sayede bir sonraki cümlede düzeltme yaparsan Pixel Buddy bağlamı kaçırmayacak.
      conversationHistory.push({ role: "user", content: childText });
      conversationHistory.push({ role: "assistant", content: data.reply });

    } catch (error) {
      console.log("Brain error:", error);

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
