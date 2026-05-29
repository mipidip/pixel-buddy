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
  
  // Tarayıcıdaki Türkçe ses kütüphanesini bulur
  const voice = voices.find(v => v.lang.startsWith("tr")) || voices.find(v => v.lang.startsWith("en")) || voices[0];

  if (voice) utter.voice = voice;

  utter.rate = 0.95; // Çocukların rahat anlaması için hafif yavaş hız
  utter.pitch = 1.1;  // Karakteri sevimli yapmak için hafif ince ses

  synth.cancel(); // Önceki konuşmayı keser
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
  bubble.textContent = "Sorry, I can't hear you here.";
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

    bubble.textContent = "I'm listening...";
    recognition.start();
  }

  recognition.onstart = () => {
    console.log("🎤 Mic started");
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

      const fallback = "Hmm… my brain is resting a little. Try again 💛";
      addMessage(fallback, "bot");
      speak(fallback);
    }
  };

  recognition.onerror = (event) => {
    console.log("Speech error:", event.error);
    bubble.textContent = "Mic problem. Tap again 🎤";
  };

  recognition.onend = () => {
    bubble.textContent = "Tap the mic to talk again 🎤";
  };

  window.startListening = startListening;
}
