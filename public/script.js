const bubble = document.getElementById("bubble");
const messages = document.getElementById("messages");

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
  
  // Tarayıcıda yüklü olan tüm sesleri alıyoruz
  const allVoices = synth.getVoices();
  
  // Önce en kaliteli Türkçe sesleri (özellikle Google veya Microsoft'un doğal seslerini) arıyoruz
  let turkishVoice = allVoices.find(v => v.lang === "tr-TR" && v.name.includes("Google"));
  
  // Eğer Google sesi bulamazsa, içinde "tr" geçen herhangi bir Türkçe ses arıyoruz
  if (!turkishVoice) {
    turkishVoice = allVoices.find(v => v.lang.startsWith("tr"));
  }

  // Bulduğumuz Türkçe sesi Pixel Buddy'e atıyoruz
  if (turkishVoice) {
    utter.voice = turkishVoice;
    console.log("Seçilen Türkçe Ses:", turkishVoice.name);
  } else {
    console.log("Sistemde yerel Türkçe ses bulunamadı, varsayılan ses kullanılıyor.");
  }

  // Çocuk dostu tonlama ayarları
  utter.rate = 0.85; // Telaffuz zorluğu varsa hızı biraz daha yavaşlatmak (0.85) netliği çok artırır
  utter.pitch = 1.15; // Sesi biraz sevimli ve ince yapar

  synth.cancel(); // Eğer o sırada konuşuyorsa keser
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

  // Eski hali: recognition.lang = "en-US";
// Yeni hali:
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
      const response = await fetch("/brain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: childText })
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

  recognition.onerror = (event) => {
    console.log("Speech error:", event.error);
    bubble.textContent = "Mikrofon problemi. Tekrar dene 🎤";
  };

  recognition.onend = () => {
    bubble.textContent = "Tap the mic to talk again 🎤";
  };

  window.startListening = startListening;
}
