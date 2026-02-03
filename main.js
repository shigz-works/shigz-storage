import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/GLTFLoader.js";

/* =========================
  CONFIG
========================= */
const AI_ENDPOINT =
"https://ai-avatar-backend-238220494455.asia-east1.run.app/chat";

/* =========================
  AI CONVERSATION MEMORY
========================= */
let conversationHistory = [];
const MAX_TURNS = 8; // user + assistant pairs

/* =========================
  SCENE
========================= */
const scene = new THREE.Scene();

/* =========================
  CAMERA (HEAD & SHOULDERS)
========================= */
const camera = new THREE.PerspectiveCamera(
28,
window.innerWidth / window.innerHeight,
0.1,
100
);
camera.position.set(0, 1.6, 1.8);
camera.lookAt(0, 1.6, 0);

/* =========================
  RENDERER
========================= */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

/* =========================
  SUBTITLES
========================= */
const subtitleBox = document.createElement("div");
subtitleBox.id = "avatar-subtitles";
subtitleBox.style.cssText = `
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 80%;
  background: rgba(0,0,0,0.7);
  color: #fff;
  padding: 14px 20px;
  border-radius: 12px;
  font-size: 18px;
  line-height: 1.4;
  font-family: Arial, sans-serif;
  text-align: center;
  z-index: 9999;
  display: none;
`;
document.body.appendChild(subtitleBox);

function showSubtitles(text) {
  subtitleBox.textContent = text;
  subtitleBox.style.display = "block";
}

function hideSubtitles() {
  subtitleBox.style.display = "none";
}

/* =========================
  VOICE INPUT BUTTON
========================= */
const micBtn = document.createElement("button");
micBtn.textContent = "🎤";
micBtn.title = "Speak";
micBtn.style.cssText = `
  position: fixed;
  bottom: 110px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #007bff;
  color: white;
  font-size: 24px;
  cursor: pointer;
  z-index: 9999;
`;
document.body.appendChild(micBtn);

/* =========================
  SPEECH TO TEXT
========================= */
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("🎤 Voice input:", transcript);

    showSubtitles("You: " + transcript);
    sendToAI(transcript);
  };

  recognition.onerror = (e) => {
    console.error("❌ Speech recognition error:", e);
  };
} else {
  micBtn.disabled = true;
  micBtn.textContent = "🚫";
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognition.start();
  console.log("🎙️ Listening...");
});

/* =========================
  LIGHTING
========================= */
scene.add(new THREE.AmbientLight(0xffffff, 4.0));
const dirLight = new THREE.DirectionalLight(0xffffff, 11);
dirLight.position.set(0, 3, 5);
scene.add(dirLight);

/* =========================
  IDLE POSE (NO T-POSE)
========================= */
function applyIdlePose(model) {
  model.traverse(obj => {
    if (!obj.isBone) return;

    // Bring upper arms down to sides (rotation around X-axis, negative to go down)
    if (obj.name.includes("UpperArm")) {
      obj.rotation.x = -Math.PI * 0.4; // ~-72° down
      obj.updateMatrixWorld(true);
    }

    // Bend elbows slightly
    if (obj.name.includes("LowerArm")) {
      obj.rotation.x = -Math.PI * 0.35; // ~-63° bend
      obj.updateMatrixWorld(true);
    }

    // Rotate shoulders inward slightly
    if (obj.name.includes("Shoulder")) {
      obj.rotation.y = obj.name.includes("L") ? Math.PI * 0.1 : -Math.PI * 0.1;
      obj.updateMatrixWorld(true);
    }
  });
}

/* =========================
  AVATAR
========================= */
let avatarRoot = null;
let mouthMeshes = [];
let blinkMeshes = [];

const loader = new GLTFLoader();
loader.load("./avatar1.glb", (gltf) => {
avatarRoot = gltf.scene;
scene.add(avatarRoot);

applyIdlePose(avatarRoot);

avatarRoot.traverse(obj => {
if (!obj.isMesh) return;

if (obj.material?.map) {
obj.material.map.colorSpace = THREE.SRGBColorSpace;
obj.material.needsUpdate = true;
}

if (obj.morphTargetDictionary?.Fcl_MTH_A !== undefined)
mouthMeshes.push(obj);

if (
obj.morphTargetDictionary?.Fcl_EYE_Close !== undefined ||
obj.morphTargetDictionary?.Fcl_EYE_Close_L !== undefined
)
blinkMeshes.push(obj);
});

setupBlinking();
setupIdleGestures();
console.log("✅ Avatar loaded & ready");
});

/* =========================
  BLINKING
========================= */
function setupBlinking() {
function blink() {
blinkMeshes.forEach(mesh => {
const d = mesh.morphTargetDictionary;
if (d.Fcl_EYE_Close !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close] = 1;
else {
if (d.Fcl_EYE_Close_L !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close_L] = 1;
if (d.Fcl_EYE_Close_R !== undefined)
mesh.morphTargetInfluences[d.Fcl_EYE_Close_R] = 1;
}
});

setTimeout(() => {
blinkMeshes.forEach(mesh =>
Object.keys(mesh.morphTargetDictionary).forEach(k => {
if (k.includes("EYE_Close"))
mesh.morphTargetInfluences[
mesh.morphTargetDictionary[k]
] = 0;
})
);
}, 120);

setTimeout(blink, 3000 + Math.random() * 3000);
}
blink();
}

/* =========================
  IDLE GESTURES (Head, Breathing, Shoulders)
========================= */
let headBone = null;
let spineBone = null;
let originalHeadRotation = null;
let originalSpinePosition = null;
let gestureIntervals = [];
let isAvatarTalking = false;

function setupIdleGestures() {
  if (!avatarRoot) return;
  
  // Find head and spine bones
  avatarRoot.traverse(obj => {
    if (obj.isBone) {
      if (obj.name.includes("Head") && !obj.name.includes("Eye")) {
        headBone = obj;
      }
      if (obj.name.includes("Chest")) {
        spineBone = obj;
      }
    }
  });

  if (!headBone || !spineBone) return;

  if (headBone) {
    originalHeadRotation = { y: 0, x: 0 };
  }
  if (spineBone) {
    originalSpinePosition = spineBone.position.y;
  }

  // Head look around
  const headInterval = setInterval(() => {
    if (headBone && !isAvatarTalking) {
      const time = Date.now() * 0.0008;
      headBone.rotation.y = Math.sin(time) * 0.15;
      headBone.rotation.x = Math.cos(time * 0.5) * 0.08;
      headBone.updateMatrixWorld(true);
    }
  }, 50);
  gestureIntervals.push(headInterval);
}

/* =========================
  LIP SYNC
========================= */
const mouthShapes = [
"Fcl_MTH_A",
"Fcl_MTH_I",
"Fcl_MTH_U",
"Fcl_MTH_E",
"Fcl_MTH_O"
];

let talkingInterval = null;

function resetMouth() {
mouthMeshes.forEach(m =>
mouthShapes.forEach(n => {
const i = m.morphTargetDictionary[n];
if (i !== undefined) m.morphTargetInfluences[i] = 0;
})
);
}

function startLipSync() {
talkingInterval = setInterval(() => {
resetMouth();
const s = mouthShapes[Math.floor(Math.random() * mouthShapes.length)];
mouthMeshes.forEach(m => {
const i = m.morphTargetDictionary[s];
if (i !== undefined) m.morphTargetInfluences[i] = 0.8;
});
}, 120);
}

function stopLipSync() {
clearInterval(talkingInterval);
resetMouth();
}

/* =========================
  BROWSER TTS HELPER
========================= */
function speakWithBrowserTTS(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => {
    isAvatarTalking = true;
    startLipSync();
    notifyStorylineSpeechStarted();
  };

  utterance.onend = () => {
    isAvatarTalking = false;
    stopLipSync();
    hideSubtitles();
    
    notifyStorylineSpeechEnded();
    
    setTimeout(() => {
      resetAvatar();
    }, 400);
  };

  utterance.onerror = (e) => {
    console.error("❌ Browser TTS error:", e);
    isAvatarTalking = false;
    stopLipSync();
    resetAvatar();
    notifyStorylineSpeechEnded();
  };

  speechSynthesis.speak(utterance);
}

/* =========================
  EMOTION SYSTEM
========================= */
const emotionMap = {
neutral: "Fcl_ALL_Neutral",
happy: "Fcl_ALL_Joy",
angry: "Fcl_ALL_Angry",
sad: "Fcl_ALL_Sorrow",
surprised: "Fcl_ALL_Surprised"
};

function setEmotion(emotion) {
console.log("😊 setEmotion:", emotion);
const morph = emotionMap[emotion];
if (!morph) return;

mouthMeshes.forEach(mesh => {
Object.values(emotionMap).forEach(e => {
const i = mesh.morphTargetDictionary[e];
if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
});
const idx = mesh.morphTargetDictionary[morph];
if (idx !== undefined) mesh.morphTargetInfluences[idx] = 1;
});
}

function resetAvatar() {
console.log("🔄 Resetting avatar to idle state");
// Reset all emotions
mouthMeshes.forEach(mesh => {
Object.values(emotionMap).forEach(e => {
const i = mesh.morphTargetDictionary[e];
if (i !== undefined) mesh.morphTargetInfluences[i] = 0;
});
});
// Reset mouth
resetMouth();
// Reapply idle pose
if (avatarRoot) applyIdlePose(avatarRoot);
}

/* =========================
   CLOUD TTS AUDIO PLAYER
   CLOUD TTS AUDIO PLAYER (FIXED)
========================= */
let audioReady = false;
let lastReply = ""; // Store for error recovery
let audioContext = null;
let lastAudioUrl = null;

const audioPlayer = new Audio();
audioPlayer.crossOrigin = "anonymous";
audioPlayer.preload = "auto";
audioPlayer.playsInline = true;
audioPlayer.muted = false;

// Silent audio data URI (valid WAV file with minimal silence)
const SILENT_AUDIO = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

function getAudioMimeFromBase64(base64) {
  if (!base64) return "audio/mpeg";

  if (base64.startsWith("UklGR")) return "audio/wav"; // WAV (RIFF)
  if (base64.startsWith("T2dn")) return "audio/ogg"; // OGG (OggS)
  if (base64.startsWith("SUQz") || base64.startsWith("//tQ")) return "audio/mpeg"; // MP3

  return "audio/mpeg";
}

function createAudioUrlFromBase64(base64, mimeType) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.warn("⚠️ Failed to create audio Blob URL", e);
    return null;
  }
}

async function ensureAudioContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioContext = new Ctx();
  }
  if (audioContext && audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

// 🔓 Audio unlock function
async function unlockAudio() {
  if (audioReady) return;

  try {
    await ensureAudioContext();

    audioPlayer.src = SILENT_AUDIO;
    audioPlayer.volume = 0.01;
    
    // Load the audio first
    await new Promise((resolve, reject) => {
      audioPlayer.onloadeddata = resolve;
      audioPlayer.onerror = reject;
      audioPlayer.load();
    });

    await audioPlayer.play();   // ✅ user gesture
    audioPlayer.pause();        // ✅ REQUIRED
    audioPlayer.currentTime = 0;
    audioPlayer.volume = 1.0;

    audioReady = true;
    console.log("🔓 Audio unlocked correctly");
  } catch (e) {
    console.warn("⚠️ Audio unlock failed", e);
    // Allow playback attempts even if unlock fails
    audioReady = true;
  }
}

audioPlayer.onplay = () => {
  if (isAvatarTalking) return;

  isAvatarTalking = true;
  startLipSync();
  notifyStorylineSpeechStarted(); // ✅ NOW SAFE
};

audioPlayer.onended = () => {
  console.log("🔇 Audio ended");
  isAvatarTalking = false;
  stopLipSync();
  hideSubtitles();

  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
    lastAudioUrl = null;
  }

  notifyStorylineSpeechEnded(); // 🔑 MUST happen immediately

  setTimeout(() => {
    resetAvatar();
  }, 400);
};

audioPlayer.onerror = (e) => {
  console.warn("⚠️ Audio element error, falling back to browser TTS");
  isAvatarTalking = false;
  stopLipSync();

  if (lastAudioUrl) {
    URL.revokeObjectURL(lastAudioUrl);
    lastAudioUrl = null;
  }
  
  // Fallback to browser TTS if we have the text
  if (lastReply) {
    speakWithBrowserTTS(lastReply);
  } else {
    notifyStorylineSpeechEnded();
  }
};

/* =========================
  STORYLINE CALLBACK
========================= */
function notifyStorylineSpeechStarted() {
  window.parent.postMessage(
    { type: "AVATAR_SPEECH_STARTED" },
    "*"
  );
}

function notifyStorylineSpeechEnded() {
window.parent.postMessage(
{ type: "AVATAR_SPEECH_ENDED" },
"*"
);
}

/* =========================
  AI CONNECTOR (CLOUD TTS)
========================= */
async function sendToAI(text) {
  console.log("➡️ sendToAI:", text);

  // 🧠 1️⃣ Store user message
  conversationHistory.push({
    role: "user",
    content: text
  });

  // Keep memory small
  if (conversationHistory.length > MAX_TURNS * 2) {
    conversationHistory = conversationHistory.slice(-MAX_TURNS * 2);
  }

  try {
    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        history: conversationHistory // ✅ SEND MEMORY
      })
    });

    const data = await res.json();
    console.log("🤖 AI payload:", data);

    // 🧠 2️⃣ Store AI reply
    if (data.reply) {
      lastReply = data.reply; // Store for error recovery
      showSubtitles(data.reply);
      conversationHistory.push({
        role: "assistant",
        content: data.reply
      });
    }

    if (data.emotion) setEmotion(data.emotion);

    // Play audio or fallback to browser TTS
    if (data.audio && audioReady) {
      const mime = data.audioMime || data.mime || data.format || getAudioMimeFromBase64(data.audio);
      const url = createAudioUrlFromBase64(data.audio, mime);

      if (url) {
        if (lastAudioUrl) {
          URL.revokeObjectURL(lastAudioUrl);
        }
        lastAudioUrl = url;
        audioPlayer.src = url;
        audioPlayer.currentTime = 0;

        try {
          await audioPlayer.play();
        } catch (err) {
          console.warn("⚠️ Audio blocked, using browser TTS", err);
          speakWithBrowserTTS(data.reply);
        }
      } else if (data.reply) {
        speakWithBrowserTTS(data.reply);
      }
    } else if (data.reply) {
      speakWithBrowserTTS(data.reply);
    }

  } catch (err) {
    console.error("❌ AI error:", err);
    isAvatarTalking = false;
    stopLipSync();
    resetAvatar();
    notifyStorylineSpeechEnded();
  }
}

/* =========================
  STORYLINE MESSAGE BRIDGE
========================= */
window.addEventListener("message", (event) => {
  if (event.data?.type === "AI_MESSAGE") {
    console.log("📩 From Storyline:", event.data.text);
    sendToAI(event.data.text);
  }
});

/* =========================
  RENDER LOOP
========================= */
function animate() {
requestAnimationFrame(animate);
renderer.render(scene, camera);
}
animate();
